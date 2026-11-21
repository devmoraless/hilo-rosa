import hashlib
import hmac
import json
import secrets
import threading
import time

from fastapi import HTTPException
from redis import Redis


class OTPStore:
    def __init__(self, clock=None, valkey_url=""):
        self.clock = clock or (lambda: time.time())
        self.redis = (
            Redis.from_url(valkey_url, decode_responses=True) if valkey_url else None
        )
        self.entries = {}
        self.lock = threading.RLock()

    def put(self, kind, payload, ttl):
        token = secrets.token_urlsafe(32)
        entry = {**payload, "expires": self.clock() + ttl}
        if self.redis:
            self.redis.set(f"access:{kind}:{token}", json.dumps(entry), ex=ttl)
        else:
            with self.lock:
                self.entries = {
                    k: v for k, v in self.entries.items() if v["expires"] > self.clock()
                }
                self.entries[f"{kind}:{token}"] = entry
        return token, entry["expires"]

    def get(self, kind, token):
        if self.redis:
            raw = self.redis.get(f"access:{kind}:{token}")
            entry = json.loads(raw) if raw else None
        else:
            entry = self.entries.get(f"{kind}:{token}")
        if not entry or self.clock() >= entry["expires"]:
            raise HTTPException(
                410 if kind == "otp" else 401,
                "El código o la sesión venció. Vuelve a entrar.",
            )
        return entry

    def challenge(self, payload):
        code = f"{secrets.randbelow(1000000):06d}"
        token, _ = self.put(
            "otp",
            {
                **payload,
                "digest": hashlib.sha256(code.encode()).hexdigest(),
                "attempts": 0,
            },
            300,
        )
        return token, code

    def verify(self, token, code):
        digest = hashlib.sha256(code.encode()).hexdigest()
        if self.redis:
            script = """
            local raw = redis.call('GET', KEYS[1])
            if not raw then return {410, ''} end
            local e = cjson.decode(raw)
            if tonumber(ARGV[2]) >= e.expires then return {410, ''} end
            if e.attempts >= 5 then return {429, ''} end
            e.attempts = e.attempts + 1
            if e.digest == ARGV[1] then
                redis.call('DEL', KEYS[1])
                return {200, raw}
            end
            redis.call('SET', KEYS[1], cjson.encode(e), 'KEEPTTL')
            return {403, ''}
            """
            status, raw = self.redis.eval(
                script, 1, f"access:otp:{token}", digest, self.clock()
            )
            if status == 200:
                return json.loads(raw)
        else:
            with self.lock:
                entry = self.get("otp", token)
                if entry["attempts"] >= 5:
                    status = 429
                else:
                    entry["attempts"] += 1
                    if hmac.compare_digest(entry["digest"], digest):
                        del self.entries[f"otp:{token}"]
                        return entry
                    status = 403
        messages = {
            403: "Código incorrecto.",
            429: "Se agotaron los intentos. Solicita otro código.",
            410: "El código venció. Solicita otro.",
        }
        raise HTTPException(status, messages[status])

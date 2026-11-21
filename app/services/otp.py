import time


class OTPStore:
    def __init__(self, clock=time.time):
        self.clock = clock

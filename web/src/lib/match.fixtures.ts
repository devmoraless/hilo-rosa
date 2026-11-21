// Set sintético para validar match.ts. TODOS los datos son ficticios (demo_data: true).
// 40 pacientes registradas + 40 búsquedas con variaciones conocidas (cada una debe encontrar a su paciente)
// + 10 búsquedas de personas que NO están registradas (no deben coincidir con nadie).
import type { MatchPatient, MatchQuery } from './match.ts';

export const DEMO_DATA = true;

export type FixturePatient = MatchPatient & { nota?: string };

export type Variacion =
  | 'acentos'
  | 'abreviatura_ma'
  | 'apellidos_invertidos'
  | 'dia_mes_invertido'
  | 'sin_segundo_apellido'
  | 'particulas'
  | 'errata'
  | 'combinada';

export type MatchCase = { patientId: string; variacion: Variacion; query: MatchQuery };
export type NonMatchCase = { descripcion: string; query: MatchQuery };

const T = 'Tamazula de Gordiano';
const Z = 'Zapotlán el Grande';

export const PATIENTS: readonly FixturePatient[] = [
  { id: 'p01', nombre: 'María', apellidos: 'López Hernández', fecha_nacimiento: '1974-03-08', municipio: T, telefono: '3410000101', nota: 'ultrasonido mar 2025' },
  { id: 'p02', nombre: 'Ana', apellidos: 'López Hernández', fecha_nacimiento: '1980-07-15', municipio: T, telefono: '3410000102' },
  { id: 'p03', nombre: 'Rosa', apellidos: 'Martínez Gómez', fecha_nacimiento: '1969-11-02', municipio: Z, telefono: '3410000103' },
  { id: 'p04', nombre: 'María Guadalupe', apellidos: 'Ramírez Torres', fecha_nacimiento: '1985-05-09', municipio: 'Tuxpan', telefono: '3410000104' },
  { id: 'p05', nombre: 'Juana', apellidos: 'Sánchez Díaz', fecha_nacimiento: '1972-04-10', municipio: 'Tecalitlán', telefono: '3410000105' },
  { id: 'p06', nombre: 'Elena', apellidos: 'Cruz Morales', fecha_nacimiento: '1990-01-12', municipio: 'Pihuamo', telefono: '3410000106' },
  { id: 'p07', nombre: 'María del Carmen', apellidos: 'Flores Ruiz', fecha_nacimiento: '1966-09-21', municipio: 'Zapotiltic', telefono: '3410000107' },
  { id: 'p08', nombre: 'Teresa', apellidos: 'Vázquez Castillo', fecha_nacimiento: '1978-06-30', municipio: 'Mazamitla', telefono: '3410000108' },
  { id: 'p09', nombre: 'Patricia', apellidos: 'Jiménez Ortiz', fecha_nacimiento: '1983-02-14', municipio: T, telefono: '3410000109' },
  { id: 'p10', nombre: 'Leticia', apellidos: 'Mendoza Aguilar', fecha_nacimiento: '1975-08-05', municipio: 'Tuxpan', telefono: '3410000110' },
  { id: 'p11', nombre: 'Silvia', apellidos: 'Reyes Navarro', fecha_nacimiento: '1988-10-03', municipio: 'Tonila', telefono: '3410000111' },
  { id: 'p12', nombre: 'María de los Ángeles', apellidos: 'Herrera Medina', fecha_nacimiento: '1970-12-07', municipio: Z, telefono: '3410000112' },
  { id: 'p13', nombre: 'Guadalupe', apellidos: 'Castro Ríos', fecha_nacimiento: '1964-03-25', municipio: 'Gómez Farías', telefono: '3410000113' },
  { id: 'p14', nombre: 'Verónica', apellidos: 'Ortega Chávez', fecha_nacimiento: '1991-07-04', municipio: 'Concepción de Buenos Aires', telefono: '3410000114' },
  { id: 'p15', nombre: 'Claudia', apellidos: 'Romero Salazar', fecha_nacimiento: '1979-11-09', municipio: T, telefono: '3410000115' },
  { id: 'p16', nombre: 'Adriana', apellidos: 'Domínguez Luna', fecha_nacimiento: '1986-04-18', municipio: 'Tecalitlán', telefono: '3410000116' },
  { id: 'p17', nombre: 'Martha', apellidos: 'Gutiérrez Peña', fecha_nacimiento: '1962-05-27', municipio: T, telefono: '3410000117' },
  { id: 'p18', nombre: 'María Isabel', apellidos: 'Moreno Vega', fecha_nacimiento: '1977-02-06', municipio: 'Pihuamo', telefono: '3410000118' },
  { id: 'p19', nombre: 'Sandra', apellidos: 'Ibarra Cervantes', fecha_nacimiento: '1984-09-01', municipio: 'Zapotiltic', telefono: '3410000119' },
  { id: 'p20', nombre: 'Gabriela', apellidos: 'Núñez Rosales', fecha_nacimiento: '1993-06-16', municipio: 'Mazamitla', telefono: '3410000120' },
  { id: 'p21', nombre: 'Norma', apellidos: 'Delgado Campos', fecha_nacimiento: '1968-10-29', municipio: 'Tuxpan', telefono: '3410000121' },
  { id: 'p22', nombre: 'Lucía', apellidos: 'Ávila Fuentes', fecha_nacimiento: '1981-03-12', municipio: T, telefono: '3410000122' },
  { id: 'p23', nombre: 'María Elena', apellidos: 'Sandoval Lara', fecha_nacimiento: '1973-08-11', municipio: 'Tonila', telefono: '3410000123' },
  { id: 'p24', nombre: 'Rocío', apellidos: 'Espinoza Mejía', fecha_nacimiento: '1987-12-03', municipio: Z, telefono: '3410000124' },
  { id: 'p25', nombre: 'Alejandra', apellidos: 'Pérez de la Cruz', fecha_nacimiento: '1995-01-08', municipio: 'Gómez Farías', telefono: '3410000125' },
  { id: 'p26', nombre: 'Irma', apellidos: 'Valencia Zúñiga', fecha_nacimiento: '1960-07-02', municipio: 'Concepción de Buenos Aires', telefono: '3410000126' },
  { id: 'p27', nombre: 'Carmen', apellidos: 'Solís Bautista', fecha_nacimiento: '1976-11-05', municipio: 'Tecalitlán', telefono: '3410000127' },
  { id: 'p28', nombre: 'Josefina', apellidos: 'Cárdenas Ponce', fecha_nacimiento: '1965-04-03', municipio: 'Pihuamo', telefono: '3410000128' },
  { id: 'p29', nombre: 'Yolanda', apellidos: 'Rangel Ochoa', fecha_nacimiento: '1982-02-09', municipio: T, telefono: '3410000129' },
  { id: 'p30', nombre: 'María Teresa', apellidos: 'Guerrero Soto', fecha_nacimiento: '1971-06-19', municipio: 'Zapotiltic', telefono: '3410000130' },
  { id: 'p31', nombre: 'Laura', apellidos: 'Esquivel Tapia', fecha_nacimiento: '1989-05-23', municipio: 'Mazamitla', telefono: '3410000131' },
  { id: 'p32', nombre: 'Beatriz', apellidos: 'Montes Galván', fecha_nacimiento: '1967-09-07', municipio: 'Tuxpan', telefono: '3410000132' },
  { id: 'p33', nombre: 'Esperanza', apellidos: 'Lozano Rivas', fecha_nacimiento: '1963-12-10', municipio: 'Tonila', telefono: '3410000133' },
  { id: 'p34', nombre: 'Margarita', apellidos: 'Contreras Villa', fecha_nacimiento: '1974-01-04', municipio: T, telefono: '3410000134' },
  { id: 'p35', nombre: 'Diana', apellidos: 'Arellano Guzmán', fecha_nacimiento: '1992-08-14', municipio: Z, telefono: '3410000135' },
  { id: 'p36', nombre: 'María José', apellidos: 'Salinas Robles', fecha_nacimiento: '1994-03-02', municipio: 'Gómez Farías', telefono: '3410000136' },
  { id: 'p37', nombre: 'Gloria', apellidos: 'Benítez Trujillo', fecha_nacimiento: '1961-10-08', municipio: 'Concepción de Buenos Aires', telefono: '3410000137' },
  { id: 'p38', nombre: 'Alicia', apellidos: 'Carrillo Mora', fecha_nacimiento: '1980-11-26', municipio: 'Tecalitlán', telefono: '3410000138' },
  { id: 'p39', nombre: 'Susana', apellidos: 'Velázquez Pineda', fecha_nacimiento: '1985-07-03', municipio: 'Pihuamo', telefono: '3410000139' },
  { id: 'p40', nombre: 'Ofelia', apellidos: 'Juárez Cortés', fecha_nacimiento: '1958-02-11', municipio: T, telefono: '3410000140' },
];

export const MATCH_CASES: readonly MatchCase[] = [
  { patientId: 'p01', variacion: 'acentos', query: { nombre: 'Maria Lopez', municipio: T } },
  { patientId: 'p02', variacion: 'acentos', query: { nombre: 'Ana Lopez Hernandez', fecha_nacimiento: '1980-07-15' } },
  { patientId: 'p03', variacion: 'apellidos_invertidos', query: { nombre: 'Rosa', apellidos: 'Gómez Martínez', fecha_nacimiento: '1969-11-02' } },
  { patientId: 'p04', variacion: 'abreviatura_ma', query: { nombre: 'Ma. Guadalupe Ramirez Torres', fecha_nacimiento: '1985-05-09' } },
  { patientId: 'p05', variacion: 'dia_mes_invertido', query: { nombre: 'Juana Sánchez Díaz', fecha_nacimiento: '1972-10-04' } },
  { patientId: 'p06', variacion: 'dia_mes_invertido', query: { nombre: 'Elena Cruz Morales', fecha_nacimiento: '1990-12-01' } },
  { patientId: 'p07', variacion: 'abreviatura_ma', query: { nombre: 'Ma. del Carmen Flores Ruiz', fecha_nacimiento: '1966-09-21' } },
  { patientId: 'p08', variacion: 'apellidos_invertidos', query: { nombre: 'Teresa Castillo Vazquez', fecha_nacimiento: '1978-06-30' } },
  { patientId: 'p09', variacion: 'sin_segundo_apellido', query: { nombre: 'Patricia Jimenez', fecha_nacimiento: '1983-02-14' } },
  { patientId: 'p10', variacion: 'dia_mes_invertido', query: { nombre: 'Leticia Mendoza Aguilar', fecha_nacimiento: '1975-05-08' } },
  { patientId: 'p11', variacion: 'combinada', query: { nombre: 'Silvia Navarro Reyes', fecha_nacimiento: '1988-03-10' } },
  { patientId: 'p12', variacion: 'abreviatura_ma', query: { nombre: 'Ma. de los Angeles Herrera Medina', fecha_nacimiento: '1970-12-07' } },
  { patientId: 'p13', variacion: 'apellidos_invertidos', query: { nombre: 'Guadalupe Rios Castro', fecha_nacimiento: '1964-03-25' } },
  { patientId: 'p14', variacion: 'combinada', query: { nombre: 'Veronica Ortega Chavez', fecha_nacimiento: '1991-04-07' } },
  { patientId: 'p15', variacion: 'combinada', query: { nombre: 'Claudia Romero', fecha_nacimiento: '1979-09-11' } },
  { patientId: 'p16', variacion: 'acentos', query: { nombre: 'ADRIANA DOMINGUEZ LUNA', fecha_nacimiento: '1986-04-18' } },
  { patientId: 'p17', variacion: 'combinada', query: { nombre: 'Martha Pena Gutierrez', fecha_nacimiento: '1962-05-27' } },
  { patientId: 'p18', variacion: 'combinada', query: { nombre: 'Ma Isabel Moreno Vega', fecha_nacimiento: '1977-06-02' } },
  { patientId: 'p19', variacion: 'dia_mes_invertido', query: { nombre: 'Sandra Ibarra Cervantes', fecha_nacimiento: '1984-01-09' } },
  { patientId: 'p20', variacion: 'acentos', query: { nombre: 'Gabriela Nunez Rosales', fecha_nacimiento: '1993-06-16' } },
  { patientId: 'p21', variacion: 'apellidos_invertidos', query: { nombre: 'Norma Campos Delgado', fecha_nacimiento: '1968-10-29' } },
  { patientId: 'p22', variacion: 'acentos', query: { nombre: 'Lucia Avila Fuentes', fecha_nacimiento: '1981-03-12' } },
  { patientId: 'p23', variacion: 'combinada', query: { nombre: 'Ma. Elena Sandoval', fecha_nacimiento: '1973-08-11' } },
  { patientId: 'p24', variacion: 'combinada', query: { nombre: 'Rocio Espinoza Mejia', fecha_nacimiento: '1987-03-12' } },
  { patientId: 'p25', variacion: 'particulas', query: { nombre: 'Alejandra Perez Cruz', fecha_nacimiento: '1995-01-08' } },
  { patientId: 'p26', variacion: 'apellidos_invertidos', query: { nombre: 'Irma Zuniga Valencia', fecha_nacimiento: '1960-07-02' } },
  { patientId: 'p27', variacion: 'combinada', query: { nombre: 'Carmen Solis Bautista', fecha_nacimiento: '1976-05-11' } },
  { patientId: 'p28', variacion: 'acentos', query: { nombre: 'Josefina Cardenas Ponce', fecha_nacimiento: '1965-04-03' } },
  { patientId: 'p29', variacion: 'combinada', query: { nombre: 'Yolanda Ochoa Rangel', fecha_nacimiento: '1982-09-02' } },
  { patientId: 'p30', variacion: 'abreviatura_ma', query: { nombre: 'Ma. Teresa Guerrero Soto', fecha_nacimiento: '1971-06-19' } },
  { patientId: 'p31', variacion: 'errata', query: { nombre: 'Laura Esquibel Tapia', fecha_nacimiento: '1989-05-23' } },
  { patientId: 'p32', variacion: 'combinada', query: { nombre: 'Beatriz Galvan Montes', fecha_nacimiento: '1967-07-09' } },
  { patientId: 'p33', variacion: 'dia_mes_invertido', query: { nombre: 'Esperanza Lozano Rivas', fecha_nacimiento: '1963-10-12' } },
  { patientId: 'p34', variacion: 'sin_segundo_apellido', query: { nombre: 'Margarita Contreras', fecha_nacimiento: '1974-01-04' } },
  { patientId: 'p35', variacion: 'acentos', query: { nombre: 'diana arellano guzman', fecha_nacimiento: '1992-08-14' } },
  { patientId: 'p36', variacion: 'combinada', query: { nombre: 'Maria Jose Salinas Robles', fecha_nacimiento: '1994-02-03' } },
  { patientId: 'p37', variacion: 'apellidos_invertidos', query: { nombre: 'Gloria Trujillo Benitez', fecha_nacimiento: '1961-10-08' } },
  { patientId: 'p38', variacion: 'errata', query: { nombre: 'Alicia Carillo Mora', fecha_nacimiento: '1980-11-26' } },
  { patientId: 'p39', variacion: 'combinada', query: { nombre: 'Susana Velazquez Pineda', fecha_nacimiento: '1985-03-07' } },
  { patientId: 'p40', variacion: 'acentos', query: { nombre: 'Ofelia Juarez Cortes', telefono: '341 000 0140' } },
];

export const NON_MATCH_CASES: readonly NonMatchCase[] = [
  { descripcion: 'mismos apellidos, fecha y municipio que p01; otro nombre de pila', query: { nombre: 'Rosa López Hernández', fecha_nacimiento: '1974-03-08', municipio: T } },
  { descripcion: 'mismo nombre y primer apellido que p01; otro segundo apellido y otra fecha', query: { nombre: 'María López Gómez', fecha_nacimiento: '1990-06-20', municipio: Z } },
  { descripcion: 'homónima de p02 con otra fecha y municipio', query: { nombre: 'Ana López Hernández', fecha_nacimiento: '1958-09-30', municipio: 'Mazamitla' } },
  { descripcion: 'homónima de p05, más joven, mismo municipio', query: { nombre: 'Juana Sánchez Díaz', fecha_nacimiento: '1995-04-10', municipio: 'Tecalitlán' } },
  { descripcion: 'nombre de pila parecido a p03 (Rosario/Rosa), misma fecha', query: { nombre: 'Rosario Martínez Gómez', fecha_nacimiento: '1969-11-02', municipio: Z } },
  { descripcion: 'comparte nombre y primer apellido con p06', query: { nombre: 'Elena Cruz Moreno', fecha_nacimiento: '2001-05-17', municipio: 'Pihuamo' } },
  { descripcion: 'comparte nombre y un apellido con p08', query: { nombre: 'Teresa Vázquez Lara', fecha_nacimiento: '1999-02-02', municipio: 'Mazamitla' } },
  { descripcion: 'apellidos invertidos de p09 pero otra fecha', query: { nombre: 'Patricia Ortiz Jiménez', fecha_nacimiento: '1950-12-24' } },
  { descripcion: 'variante de p17 con otra fecha', query: { nombre: 'Marta Gutierrez Pena', fecha_nacimiento: '1990-05-27', municipio: T } },
  { descripcion: 'misma fecha y municipio que p07, apellidos de p07 invertidos, otro nombre', query: { nombre: 'Fernanda Ruiz Flores', fecha_nacimiento: '1966-09-21', municipio: 'Zapotiltic' } },
];

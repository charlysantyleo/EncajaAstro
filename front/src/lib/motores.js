// Motores mas comunes, por cilindrada y cilindros, con el mismo formato que el catalogo de vehiculos
// ("1.6L 4 cil."). Se ofrecen cuando el catalogo no conoce los motores de un modelo (los que solo se venden
// en Mexico, por ejemplo). Es una lista y no texto libre para que el mismo motor no quede escrito de diez
// maneras ("1.6", "1.6 L", "1600cc").
export const MOTORES_COMUNES = [
  ['4 cilindros o menos', ['1.0L 3 cil.', '1.2L 3 cil.', '1.2L 4 cil.', '1.4L 4 cil.', '1.5L 3 cil.', '1.5L 4 cil.', '1.6L 4 cil.', '1.8L 4 cil.', '2.0L 4 cil.', '2.4L 4 cil.', '2.5L 4 cil.', '2.7L 4 cil.']],
  ['5 y 6 cilindros', ['2.5L 5 cil.', '3.0L 6 cil.', '3.5L 6 cil.', '3.6L 6 cil.', '4.0L 6 cil.']],
  ['8 cilindros', ['5.0L 8 cil.', '5.3L 8 cil.', '5.7L 8 cil.']],
];

// Un auto electrico no tiene cilindrada: su motor se anota solo.
export const MOTOR_ELECTRICO = 'Eléctrico';

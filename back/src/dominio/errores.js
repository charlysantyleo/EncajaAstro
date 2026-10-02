// Errores del negocio. No saben nada de GraphQL ni de HTTP: el adaptador de entrada
// decide como mostrarlos (GraphQL los traduce a extensions.code).

export class ErrorDeNegocio extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = 'ErrorDeNegocio';
  }
}

// No hay sesion (invitado o token invalido).
export class NoAutenticado extends ErrorDeNegocio {
  constructor(mensaje = 'Necesitas iniciar sesión') {
    super(mensaje);
    this.name = 'NoAutenticado';
  }
}

// Hay sesion, pero no tiene permiso para esto.
export class Prohibido extends ErrorDeNegocio {
  constructor(mensaje) {
    super(mensaje);
    this.name = 'Prohibido';
  }
}

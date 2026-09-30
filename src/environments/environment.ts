export const environment = {
  production: false,
  // El backend de Vercel. Ojo: esto es lo que define contra que se prueba TODO
  // lo nuevo, y Vercel solo corre lo que se ha desplegado. Cualquier modulo
  // nuevo (examenes, la escuela AMTKD) no existe ahi hasta hacer push, asi que
  // falla con 404/401 y parece un bug del frontend cuando el codigo esta bien.
  // Para probar contra el local hay que poner http://localhost:3000/api Y tener
  // DATABASE_URL en back-end_pagos/.env, o el login tira 500.
  apiUrl: 'https://back-end-pagos-smoky.vercel.app/api',
};

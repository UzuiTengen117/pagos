// El nombre de la academia, que el modal de inscripcion muestra precargado y
// bloqueado. Copia de `src/config/escuela.js` en el backend: el frontend no
// puede importar de ahi, asi que los dos lados guardan el mismo valor y hay que
// tocarlos juntos si la academia cambia de nombre.
//
// Por que vive aqui y no en el modelo: no es un dato de un evento ni de un
// alumno, es de la academia entera. Va aparte para que cambiarlo sea buscar en
// dos archivos, no cazarlo dentro de seis componentes.
export const NOMBRE_ESCUELA = 'AMTKD';

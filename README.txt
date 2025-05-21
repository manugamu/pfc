Para desplegar el proyecto 


Descargar la apk en pfc\FrontRN\android\app\build\outputs\apk\release


Tenemos 3 roles:

FALLA: Puede crear eventos y hablar en ellos, tiene chat privado de FALLA, puede aceptar usuarios USER, una vez los acepta pasan a ser FALLERO

FALLERO: Puede crear eventos y hablar en ellos, tienen chat privado de FALLA, son USER que han enviado petición de unión a falla y han sido aceptados

USER: no pueden crear eventos, no tienen chat privado dado que no pertenecen a ningúna FALLA, solo pueden hablar en los chats de los eventos


EN CASO DE NO HABER FALLAS CREADAS:
Se tiene que crear una FALLA mediante CrearFalla.js (pfc\CrearFallayChatTest\CrearFalla.js) si se quiere tener eventos, porque sin una falla inicial no hay eventos ni pueden haber FALLEROS que puedan crearlos, solo USERs que, recordemos que no pueden crear eventos.
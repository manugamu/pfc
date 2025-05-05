Para desplegar el proyecto 


1- Desplegar redis desde cmd (pfc-24-25-manugamu):

docker-compose up -d 
------------------------------------------------------------

2- Desplegar el server de java+springboot (BackJava):

ProyectoFinalApplication.java -> run as -> Java Application
------------------------------------------------------------

3- Desplegar el server websocket+expres de node.js (BackJs):

node index.js 
------------------------------------------------------------

4- Desplegar el proyecto en androidstudio (FrontRN):

npm i

npx react-native run-android



Tenemos 3 roles:

FALLA: Puede crear eventos y hablar en ellos, tiene chat privado de FALLA, puede aceptar usuarios USER, una vez los acepta pasan a ser FALLERO

FALLERO: Puede crear eventos y hablar en ellos, tienen chat privado de FALLA, son USER que han enviado petición de unión a falla y han sido aceptados

USER: no pueden crear eventos, no tienen chat privado dado que no pertenecen a ningúna FALLA, solo pueden hablar en los chats de los eventos


Se tiene que crear una FALLA mediante CrearFalla.js (CrearFalla y ChatTest) si se quiere tener eventos, porque sin una falla inicial no hay eventos ni pueden haber FALLEROS que puedan crearlos, solo USERs que, recordemos que no pueden crear eventos.
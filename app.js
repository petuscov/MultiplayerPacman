var http = require("http");
var fileSystem = require('fs');
var path = require('path');
var express = require('express');
var app = express();
var serv = require('http').Server(app);


app.get('/css/index.css',function(req,res){
    res.sendFile(__dirname + '/css/index.css');   
});
app.get('/css/res/background.jpg',function(req,res){
    res.sendFile(__dirname + '/css/res/background.jpg');
});
app.get('/css/res/background-mobile.jpg',function(req,res){
    res.sendFile(__dirname + '/css/res/background-mobile.jpg');
});
app.get('/res/levels/1.txt',function(req,res){
    //console.log(req); Podemos ver la estructura del JSON del request.
    res.sendFile(__dirname + '/res/levels/1.txt'); 
});
app.get('/favicon.ico',function(req,res){
    res.sendFile(__dirname + '/res/pacman.ico');
});
//al final NO lo cojemos de internet.
app.get('/js/jquery-3.1.1.min.js',function(req,res){
    res.sendFile(__dirname + '/js/jquery-3.1.1.min.js');
});


/****** pruebas *******/
app.get('/pruebaFPS.html',function(req,res){
    res.sendFile(__dirname + '/pruebaFPS.html');
});
/****** room *******/
app.get('/js/pacman.js',function(req,res){
    res.sendFile(__dirname + '/js/pacman.js');
});
app.get('/pacman.html',function(req,res){
    res.sendFile(__dirname + '/pacman.html'); 
});
app.get('/css/pacman.css',function(req,res){
    res.sendFile(__dirname + '/css/pacman.css'); 
});

/****** main hub *******/
app.get('/',function(req,res){
    res.sendFile(__dirname + '/main.html'); 
});
app.get('/main.html',function(req,res){
    res.sendFile(__dirname + '/main.html');
});
app.get('/main.js',function(req,res){
    res.sendFile(__dirname + '/main.js');
});
/****** missing room *******/
app.get('/missingRoom.html',function(req,res){
    res.sendFile(__dirname + '/missingRoom.html');
});

serv.listen(8888);
console.log("Server running (port 8888)...");


contarConectados = function(){
    var cont = 0;
    for( var j=0;j<listaSalas.length;j++){
     
        for(var k=0;k<listaSalas[j]["sockets"].length;k++){ 
            cont++;
        }
        
    }
    return cont;
}

function toObject(arr) {
  var rv = {};
  for (var i = 0; i < arr.length; ++i)
    rv[i] = arr[i];
  return rv;
}


//Parte Servidor

function GF(nombreS){

    var over;
    var GLOBAL_TILE_SIDE = 20; //BALDOSAS CUADRADAS //se puede poner a 22,21,etc sin problemas //24
    var GLOBAL_PACMAN_VEL = 3; //3
    var GLOBAL_GHOST_HOME_RETURN_SPEED = 4; //4
    var GLOBAL_GHOST_VULNERABLE_SPEED = 2; //2
    var GLOBAL_GHOST_SPEED = 3; //3
    var columnaPac; //MRs Pacman
    var filaPac;
    var columnaPacDos; //Pacman (2do player)
    var filaPacDos;
    var pelletsCargados;
    var that = this;

    this.nombreSala = nombreS;
    var confirm = {};

    var casaXBaldosa; //dentro de la casa de los fantasmas, baldosa, no coordenada.
    var casaYBaldosa;
    var numGhosts = 4;
    var mapaEstrella = [];
    var mapaPelletsCargados;

    var thisLevel = null;
    this.ghosts = {};

    var Ghost = function(id){

        this.x = 0;
        this.y = 0;
        this.velX = 0;
        this.velY = 0;
        this.state = Ghost.NORMAL;
        this.nearestRow = 0;
        this.nearestCol = 0;
        this.baldosaOrigenX;
        this.baldosaOrigenY;
        this.id = id;
        this.calcularPosiblesDirecciones = function(x,y){
            var posiblesDirecciones = [];
            if((x % that.thisGame.TILE_WIDTH) == 0 && (y % that.thisGame.TILE_HEIGHT) == 0){ //en baldosa exacta.
                if(!thisLevel.isWall(getRow(y),getCol(x-1))){
                    tile = thisLevel.getMapTile(getRow(y),getCol(x-1));//
                    if(tile!=20){// tile!=11 && ){ //11 se considera wall
                        posiblesDirecciones.push(0); //izquierda
                    }
                }
                if(!thisLevel.isWall(getRow(y-1),getCol(x))){
                    tile = thisLevel.getMapTile(getRow(y-1),getCol(x));
                    if(tile!=21){
                        posiblesDirecciones.push(1); //arriba
                    }
                }
                if(!thisLevel.isWall(getRow(y),getCol(x+that.thisGame.TILE_WIDTH))){
                    tile = thisLevel.getMapTile(getRow(y),getCol(x+that.thisGame.TILE_WIDTH));
                    if(tile!=20){ //&& tile!=13){ //13 se considera wall
                        posiblesDirecciones.push(2); //derecha
                    }
                }
                if(!thisLevel.isWall(getRow(y+that.thisGame.TILE_HEIGHT),getCol(x))){
                    tile = thisLevel.getMapTile(getRow(y+that.thisGame.TILE_HEIGHT),getCol(x));
                    if(tile!=1 && tile!=21){
                        posiblesDirecciones.push(3); //abajo
                    }else{
                        if(this.state==Ghost.SPECTACLES){posiblesDirecciones.push(3);}
                    }
                }
            }
            return posiblesDirecciones;
        };
     
        this.movimientoEstrella = function(){
            var MAPWIDTH = thisLevel.lvlWidth;
            var MAPHEIGHT = thisLevel.lvlHeight;
            var BaldosaWidth = that.thisGame.TILE_WIDTH;
            var BaldosaHeight = that.thisGame.TILE_HEIGHT;
            var baldosaX = Math.floor(this.x/BaldosaWidth);
            var baldosaY = Math.floor(this.y/BaldosaHeight);

            var valorBaldosaFantasma = mapaEstrella[baldosaX+baldosaY*MAPWIDTH];
            var direccion = "";
            var direcciones = this.calcularPosiblesDirecciones(this.x,this.y);
            var encontrado = false;

            if(baldosaX==casaXBaldosa && baldosaY==casaYBaldosa){
                this.state = Ghost.NORMAL;

            }else{

                while(direcciones.length>0 && !encontrado){ 

                    switch(direcciones[0]){
                        case 0: if(valorBaldosaFantasma>mapaEstrella[baldosaX-1+baldosaY*MAPWIDTH]){encontrado = true;direccion=0;}break; //izquierda
                        case 1: if(valorBaldosaFantasma>mapaEstrella[baldosaX+(baldosaY-1)*MAPWIDTH]){encontrado = true;direccion=1;}break; //arriba
                        case 2: if(valorBaldosaFantasma>mapaEstrella[baldosaX+1+baldosaY*MAPWIDTH]){encontrado = true;direccion=2;}break; //derecha
                        case 3: if(valorBaldosaFantasma>mapaEstrella[baldosaX+(baldosaY+1)*MAPWIDTH]){encontrado = true;direccion=3;}break; //abajo
                    }
                    direcciones.shift();
                }
                switch(direccion){
                    case 0: this.velX = -GLOBAL_GHOST_HOME_RETURN_SPEED; this.velY = 0;this.x = this.x + this.velX;this.y = this.y + this.velY; break;
                    case 1: this.velX = 0; this.velY = -GLOBAL_GHOST_HOME_RETURN_SPEED;this.x = this.x + this.velX;this.y = this.y + this.velY; break;
                    case 2: this.velX = GLOBAL_GHOST_HOME_RETURN_SPEED; this.velY = 0;this.x = this.x + this.velX;this.y = this.y + this.velY; break;
                    case 3: this.velX = 0; this.velY = GLOBAL_GHOST_HOME_RETURN_SPEED;this.x = this.x + this.velX;this.y = this.y + this.velY; break;
                    default:{ //se entra aquí si el array con direcciones está vacio porque el fantasma no se encontraba EXACTAMENTE en una baldosa
                        nuevX = this.x + this.velX;nuevY = this.y + this.velY;
                        baldosaXNueva = Math.floor(nuevX/BaldosaWidth);
                        baldosaYNueva = Math.floor(nuevY/BaldosaHeight);
                        if(baldosaXNueva != baldosaX || baldosaYNueva!=baldosaY){ //al actualizar posición se cambiaria de casilla. ajustar EXACTA a la que deba ser.
                            if(this.velX > 0 || this.velY > 0){
                                this.x = baldosaXNueva*BaldosaWidth;
                                this.y = baldosaYNueva*BaldosaHeight;
                            }else{
                                if(this.velX < 0 || this.velY < 0){
                                    this.x = baldosaX*BaldosaWidth;
                                    this.y = baldosaY*BaldosaHeight;
                                }else{
                                    console.log("comportamiento extraño");
                                }
                            }
                        }else{
                            this.x = nuevX;
                            this.y = nuevY; 
                        }
                        break;
                    }
                }
            }
        }

        this.move = function() {
            var posiblesDirecciones;
            var direccion;
            // Si el estado del fantasma es Ghost.SPECTACLES el fantasma regresa a casa por el camino más corto
            if(this.state == Ghost.SPECTACLES){
                
                if(this.velX == this.velY){//para los tests.
                    posiblesDirecciones = this.calcularPosiblesDirecciones(this.x,this.y);
                    direccion = Math.floor(Math.random()*posiblesDirecciones.length); 
                    switch(posiblesDirecciones[direccion]){
                        case 0: this.velX = -GLOBAL_GHOST_HOME_RETURN_SPEED; this.velY = 0; break;
                        case 1: this.velX = 0; this.velY = -GLOBAL_GHOST_HOME_RETURN_SPEED; break;
                        case 2: this.velX = GLOBAL_GHOST_HOME_RETURN_SPEED; this.velY = 0; break;
                        case 3: this.velX = 0; this.velY = GLOBAL_GHOST_HOME_RETURN_SPEED; break;
                    }
                }
                this.movimientoEstrella();
            }else{

                
                if(this.x % that.thisGame.TILE_WIDTH == 0 && this.y % that.thisGame.TILE_HEIGHT == 0){ //en baldosa exacta.
                    posiblesDirecciones = [];
                    posiblesDirecciones=this.calcularPosiblesDirecciones(this.x,this.y);
                    
                    if( posiblesDirecciones.length>2){//si hay bifurcación
                        var previousDir;
                        var index;
                        if(this.velX < 0){
                            //previousDir=0; //izquierda
                            //quitamos el 2 del array de posibles direcciones si está.
                            index = posiblesDirecciones.indexOf(2);
                            if(index>-1){posiblesDirecciones.splice(index,1);}
                        }
                        if(this.velX > 0){
                            //previousDir=2; //derecha
                            //quitamos el 0 del array de posibles direcciones si está.
                            index = posiblesDirecciones.indexOf(0);
                            if(index>-1){posiblesDirecciones.splice(index,1);}
                        }
                        if(this.velY < 0){
                            //previousDir=1; //arriba 
                            //quitamos el 3 del array de posibles direcciones si está.
                            index = posiblesDirecciones.indexOf(3);
                            if(index>-1){posiblesDirecciones.splice(index,1);}
                        }
                        if(this.velY > 0){
                            //previousDir=3; //abajo
                            //quitamos el 1 del array de posibles direcciones si está.
                            index = posiblesDirecciones.indexOf(1);
                            if(index>-1){posiblesDirecciones.splice(index,1);}
                        }
                        direccion = Math.floor(Math.random()*posiblesDirecciones.length); 
                        switch(posiblesDirecciones[direccion]){
                            case 0: this.velX = -GLOBAL_GHOST_SPEED; this.velY = 0; break;
                            case 1: this.velX = 0; this.velY = -GLOBAL_GHOST_SPEED; break;
                            case 2: this.velX = GLOBAL_GHOST_SPEED; this.velY = 0; break;
                            case 3: this.velX = 0; this.velY = GLOBAL_GHOST_SPEED; break;
                        }
                    }else{
                        var possiblePlayerX = this.x;
                        var possiblePlayerY = this.y;
                        if(this.velX < 0){
                            possiblePlayerX= this.x + this.velX;
                        }
                        if(this.velX > 0){
                            possiblePlayerX= this.x + this.velX + that.thisGame.TILE_WIDTH;
                        }
                        if(this.velY < 0){
                            possiblePlayerY = this.y + this.velY;
                        }
                        if(this.velY > 0){
                            possiblePlayerY = this.y + this.velY + that.thisGame.TILE_HEIGHT;
                        }
                        var columna = Math.floor(possiblePlayerX / that.thisGame.TILE_WIDTH);
                        var fila = Math.floor(possiblePlayerY / that.thisGame.TILE_HEIGHT);
                        var tile = thisLevel.getMapTile(fila,columna);
                        if(thisLevel.isWall(fila,columna) || tile ==20 || tile ==21){
                            direccion = Math.floor(Math.random()*posiblesDirecciones.length); 
                            switch(posiblesDirecciones[direccion]){
                                case 0: this.velX = -GLOBAL_GHOST_SPEED; this.velY = 0; break;
                                case 1: this.velX = 0; this.velY = -GLOBAL_GHOST_SPEED; break;
                                case 2: this.velX = GLOBAL_GHOST_SPEED; this.velY = 0; break;
                                case 3: this.velX = 0; this.velY = GLOBAL_GHOST_SPEED; break;
                            }
                        }
                    }
                    this.x = this.x + this.velX;
                    this.y = this.y + this.velY;
                }else{ 
                    //Si no se encuentra en baldosa exacta
                    //Si el tamaño de la baldosa es p.e 24 la velocidad normal de los fantasmas debe ser multiplo de ese numero para tod0 ok
                    //Por eso corregimos movimiento:
                    
                    var BaldosaWidth = that.thisGame.TILE_WIDTH;
                    var BaldosaHeight = that.thisGame.TILE_HEIGHT;
                    var baldosaX = Math.floor(this.x/BaldosaWidth);
                    var baldosaY = Math.floor(this.y/BaldosaHeight);
                    var nuevX = this.x + this.velX;
                    var nuevY = this.y + this.velY;
                    var baldosaXNueva = Math.floor(nuevX/BaldosaWidth);
                    var baldosaYNueva = Math.floor(nuevY/BaldosaHeight);
                    if(baldosaXNueva != baldosaX || baldosaYNueva!=baldosaY){ //al actualizar posición se cambiaria de casilla. ajustar EXACTA a la que deba ser.
                        if(this.velX > 0 || this.velY > 0){
                            this.x = baldosaXNueva*BaldosaWidth;
                            this.y = baldosaYNueva*BaldosaHeight;
                        }else{
                            if(this.velX < 0 || this.velY < 0){
                                this.x = baldosaX*BaldosaWidth;
                                this.y = baldosaY*BaldosaHeight;
                            }else{
                                console.log("comportamiento extraño");
                            }
                        }
                    }else{
                        this.x = nuevX;
                        this.y = nuevY; 
                    }
                }
            }
        };
    }; // fin clase Ghost

    // static variables
    Ghost.NORMAL = 1;
    Ghost.VULNERABLE = 2;
    Ghost.SPECTACLES = 3;
    var Level = function() {
        //this.ctx = ctx;
        this.lvlWidth = 0;
        this.lvlHeight = 0;
        this.map = [];
        this.pellets = 0;
        this.powerPelletBlinkTimer = 0;

        this.setMapTile = function(row, col, newValue){
            this.map[row*this.lvlWidth+col]=newValue;
        };

        this.getMapTile = function(row, col){   
            return this.map[row*this.lvlWidth+col]; 
        };

        this.printMap = function(){
            console.log(this.map);
        };

        this.loadLevel = function(){
            fileSystem.readFile(__dirname+"/res/levels/1.txt", function(err, f){ //dejamos de usar jquery en node.
                if(err!==null){console.log(err)};
                var lineas = f.toString().split('\n');
                var numFila = 0;
                var arrayFilas = [];
                for (i = 0; i < lineas.length; i++) {//Por cada linea
                    elementosL = lineas[i].split(" ");
                    
                    if(elementosL[0] == "#"){
                        if(elementosL[1] == "lvlwidth"){thisLevel.lvlWidth=elementosL[2];} 
                        if(elementosL[1] == "lvlheight"){thisLevel.lvlHeight=elementosL[2];}
                    }else if(elementosL[0]== ""){//para evitar interpretar lineas en blanco, se ignoran
                    }else{
                        arrayFilas.push(elementosL);
                    }
                    
                } //codigo optimizado, antes era ineficiente.
                for(var numFila =0; numFila < arrayFilas.length; numFila++){
                    for(j = 0; j < arrayFilas[0].length;j++){ //cojemos el 0 porque es irrelevante que fila coger puesto que tienen la misma longitud.
                        thisLevel.setMapTile((numFila),j,arrayFilas[numFila][j]);
                        if(arrayFilas[numFila][j] == "5"){
                            columnaPacDos= j;
                            filaPacDos = numFila;
                        }
                        if(arrayFilas[numFila][j] == "4"){
                            columnaPac= j;
                            filaPac = numFila;
                        }
                        if(arrayFilas[numFila][j] == "3"){
                            thisLevel.pellets+=1;
                        }
                        if(arrayFilas[numFila][j] == "2"){
                            thisLevel.pellets+=1;
                        }
                        //inicializamos posiciones origen fantasmas:
                        if(arrayFilas[numFila][j] == "10"){
                            that.ghosts[0].baldosaOrigenX = j;
                            that.ghosts[0].baldosaOrigenY = numFila;
                        }
                        if(arrayFilas[numFila][j] == "11"){
                            that.ghosts[1].baldosaOrigenX = j;
                            that.ghosts[1].baldosaOrigenY = numFila;
                        }
                        if(arrayFilas[numFila][j]== "12"){
                            that.ghosts[2].baldosaOrigenX = j;
                            that.ghosts[2].baldosaOrigenY = numFila;
                            casaXBaldosa = j; //inicializamos casilla "casa" de los fantasmas.
                            casaYBaldosa = numFila;
                        }
                        if(arrayFilas[numFila][j] == "13"){
                            that.ghosts[3].baldosaOrigenX = j;
                            that.ghosts[3].baldosaOrigenY = numFila;
                        }
                    }
                }
                pelletsCargados = thisLevel.pellets;
                mapaPelletsCargados = thisLevel.map.slice();
                thisLevel.cargarMapaEstrella();
                //console.log("mapa cargado correctamente"+thisLevel.map);
            });
        };
        this.cargarMapaEstrella = function(){
            var MAPWIDTH = thisLevel.lvlWidth;
            var MAPHEIGHT = thisLevel.lvlHeight;
            var casillasAComprobar = [];
            var casillasVisitadas = thisLevel.map.slice(); //creamos copia
            for(var i=0;i<casillasVisitadas.length;i++){
                if(casillasVisitadas[i]<100 || mapaEstrella[i]>199){
                    casillasVisitadas[i]=1; //las casillas que se pueden visitar a 1, las visitadas a 2.
                }else{
                    casillasVisitadas[i]=-1; //ponemos -1 en las paredes.
                }
            }
            
            mapaEstrella = casillasVisitadas.slice(); //creamos copia

            mapaEstrella[casaXBaldosa + casaYBaldosa*MAPWIDTH] = 1; //la casa de los fantasmas tiene un valor de 1. (el más bajo)
            casillasVisitadas[casaXBaldosa + casaYBaldosa*MAPWIDTH] = 2;
            casillaInicial = casaXBaldosa + casaYBaldosa*MAPWIDTH;
            casillasAComprobar.push(casillaInicial);
            while(casillasAComprobar.length > 0){
                casillaAComprobar = casillasAComprobar.shift();
                valorCasilla = mapaEstrella[casillaAComprobar];
                //izquierda
                if(casillaAComprobar%MAPWIDTH!=0){ //si el resto es 0 no hay nada a la izquierda (borde del mapa)
                    casIzRow = Math.floor(casillaAComprobar/MAPWIDTH);
                    casIzCol = casillaAComprobar%MAPWIDTH-1;
                    if(!this.isWall(casIzRow,casIzCol)){
                        if(casillasVisitadas[casIzCol+casIzRow*MAPWIDTH] != 2){
                            casillasAComprobar.push(casIzCol + casIzRow * MAPWIDTH);
                            mapaEstrella[casIzCol + casIzRow * MAPWIDTH] = valorCasilla+1;
                            casillasVisitadas[casIzCol + casIzRow * MAPWIDTH] = 2;
                        }
                    }
                }
                //derecha 
                if(casillaAComprobar%MAPWIDTH!=MAPWIDTH-1){ //si el resto es igual al ancho del mapa no hay nada a la derecha(borde del mapa)
                    casIzRow = Math.floor(casillaAComprobar/MAPWIDTH);
                    casIzCol = casillaAComprobar%MAPWIDTH+1;
                    if(!this.isWall(casIzRow,casIzCol)){
                        if(casillasVisitadas[casIzCol+casIzRow*MAPWIDTH] != 2){
                            casillasAComprobar.push(casIzCol + casIzRow * MAPWIDTH);
                            mapaEstrella[casIzCol + casIzRow * MAPWIDTH] = valorCasilla+1;
                            casillasVisitadas[casIzCol + casIzRow * MAPWIDTH] = 2;
                        }
                    }
                }
                //arriba
                if(Math.floor(casillaAComprobar/MAPWIDTH)!=0){ //si la división es 0 no hay nada arriba (borde del mapa)
                    casIzRow = Math.floor(casillaAComprobar/MAPWIDTH)-1;
                    casIzCol = casillaAComprobar%MAPWIDTH;
                    if(!this.isWall(casIzRow,casIzCol)){
                        if(casillasVisitadas[casIzCol+casIzRow*MAPWIDTH] != 2){
                            casillasAComprobar.push(casIzCol + casIzRow * MAPWIDTH);
                            mapaEstrella[casIzCol + casIzRow * MAPWIDTH] = valorCasilla+1;
                            casillasVisitadas[casIzCol + casIzRow * MAPWIDTH] = 2;
                        }
                    }
                }
                //abajo
                if(Math.floor(casillaAComprobar/MAPWIDTH)!=MAPHEIGHT-1){ //si la división es igual a la altura no hay nada debajo (borde del mapa)
                    casIzRow = Math.floor(casillaAComprobar/MAPWIDTH)+1;
                    casIzCol = casillaAComprobar%MAPWIDTH;
                    if(!this.isWall(casIzRow,casIzCol)){
                        if(casillasVisitadas[casIzCol+casIzRow*MAPWIDTH] != 2){
                            casillasAComprobar.push(casIzCol + casIzRow * MAPWIDTH);
                            mapaEstrella[casIzCol + casIzRow * MAPWIDTH] = valorCasilla+1;
                            casillasVisitadas[casIzCol + casIzRow * MAPWIDTH] = 2;
                        }
                    }
                }
            }
           //tenemos en mapaEstrella el mapa estrella hasta casa de los fantasmas.
            //for(var j =0;j<MAPHEIGHT;j++){
            //  fila = "";
            //  for(var i=0;i<MAPWIDTH;i++){
            //      fila = fila + mapaEstrella[j*MAPWIDTH+i] +" ";
            //  }
            //  console.log(fila);
            //}
        }
        
        this.isWall = function(row, col) { 
            var tile = thisLevel.getMapTile(row,col);
            tile = parseInt(tile, 10);
            var wall = false;
            if(tile>=100 && tile <=199){
                wall = true;
            }
            //if(isNaN(tile)){//fuera del mapa (No nos es necesario)
            //  wall=true;
            //}
            if(tile==11||tile==13){
                wall=true;
            }
            return wall;
        };


        this.checkIfHitWall = function(possiblePlayerX, possiblePlayerY, row, col){
            // Determinar si el jugador va a moverse a una fila,columna que tiene pared 
            var colision = false;
            //se comprueba si hay colisión al moverse normalmente, movimiento rectilíneo uniforme, sin pulsar tecla
            if(row == null && col == null){ 
                columna = Math.floor(possiblePlayerX / that.thisGame.TILE_WIDTH);
                fila = Math.floor(possiblePlayerY / that.thisGame.TILE_HEIGHT);
                if(thisLevel.isWall(fila,columna)){
                    colision = true;
                }
            }else{
                //codigo para mirar si hay colision al pulsar tecla, row y col solo se pasan si se pulsa tecla
                
                columna = Math.floor(possiblePlayerX / that.thisGame.TILE_WIDTH); 
                fila = Math.floor(possiblePlayerY / that.thisGame.TILE_HEIGHT);

                if(thisLevel.isWall(fila,columna)){
                    colision = true;
                }else{
                    if(columna == col){ //pacman moviendose en eje vertical y se pulsa tecla arriba ó abajo.
                        if(possiblePlayerX!=col*that.thisGame.TILE_WIDTH){//si las coordenadas de la columna a la que se entra no coinciden exactamente colisión.
                            colision = true;
                        }
                    }else{  
                        if(fila == row){  //pacman moviendose en eje horizontal y se pulsa tecla derecha o izquierda.
                            if(possiblePlayerY!=row*that.thisGame.TILE_HEIGHT){//si las coordenadas de la fila a la que se entra no coinciden exactamente colisión.
                                colision = true;
                            }
                        }else{  
                            console.log("comportamiento inesperado");
                            console.log(possiblePlayerX +" , "+possiblePlayerY);
                        }

                    }
                }
            }
            //Colision con fantasmas se mira en métod0 move.
            return colision;  
        };

        this.checkIfHit = function(playerX, playerY, x, y, holgura){
            // Tu código aquí   
            var proyeccionX = false;
            var proyeccionY = false;
            var hit = false;
            if(Math.abs(playerX - x)<holgura){
                proyeccionX = true;
            }   
            if(Math.abs(playerY - y)<holgura){
                proyeccionY = true;
            }
            if(proyeccionY && proyeccionX){hit = true;}
            return hit; 
        };


        this.checkIfHitSomething = function(playerX, playerY, row, col,playerId){
            var tileID = {
                'door-h' : 20,
                'door-v' : 21,
                'pellet-power' : 3,
                'pellet': 2
            };

            //  Gestiona la recogida de píldoras
            columna = Math.floor(playerX / that.thisGame.TILE_WIDTH); 
            fila = Math.floor(playerY / that.thisGame.TILE_HEIGHT);
            //No se hace USO DE ROW Y COL
            if(columna==playerX / that.thisGame.TILE_WIDTH && fila==playerY / that.thisGame.TILE_HEIGHT){

                if(thisLevel.getMapTile(fila,columna)=="2"){ 
                    thisLevel.setMapTile(fila,columna,"0");
                    pelletComido(fila,columna,that.nombreSala);//Informamos a los sockets que están conectados.
                    thisLevel.pellets-=1; 
                    that.listaPlayers[playerId].points+=10;
                    
                    if(thisLevel.pellets == 0){
                        
                        passLevel();
                        

                    }
                }
            }

            //  Gestiona las puertas teletransportadoras
            if(thisLevel.getMapTile(fila,columna)=="20"){ //|| thisLevel.getMapTile(fila,columna+1)=="20"){  // || para detectar antes puerta lateral derecha. (y pasar el test.)
                if(columna==playerX / that.thisGame.TILE_WIDTH && fila==playerY / that.thisGame.TILE_HEIGHT){
                    if(getCol(playerX)==0){//"teletransporte" de izquierda a derecha
                        that.listaPlayers[playerId].x = thisLevel.lvlWidth * that.thisGame.TILE_WIDTH-1-2*that.thisGame.TILE_WIDTH; //2* para evitar bucle debido a detectar antes puerta lateral derecha.
                        that.listaPlayers[playerId].velX = -GLOBAL_PACMAN_VEL;
                    }else{//"teletransporte" de derecha a izquierda
                        that.listaPlayers[playerId].x = 1+that.thisGame.TILE_WIDTH;
                        that.listaPlayers[playerId].velX = GLOBAL_PACMAN_VEL;
                    }
                }
                
            }
            if(thisLevel.getMapTile(fila,columna)=="21"){//|| thisLevel.getMapTile(fila+1,columna)=="21"){ // || para detectar antes puerta inferior. (y pasar el test.)
                if(columna==playerX / that.thisGame.TILE_WIDTH && fila==playerY / that.thisGame.TILE_HEIGHT){
                    if(getRow(playerY)==0){//"teletransporte" de arriba a abajo
                        that.listaPlayers[playerId].y = thisLevel.lvlHeight* that.thisGame.TILE_HEIGHT-1-2*that.thisGame.TILE_HEIGHT; //2* para evitar bucle debido a detectar antes puerta inferior.
                        that.listaPlayers[playerId].velY = -GLOBAL_PACMAN_VEL;
                    }else{//"teletransporte" de abajo a arriba

                        that.listaPlayers[playerId].y = 1+that.thisGame.TILE_HEIGHT;
                        that.listaPlayers[playerId].velY = GLOBAL_PACMAN_VEL;
                    }
                }
            }
            // Gestionamos la recogida de píldoras de poder (cambiamos estado de los fantasmas)
            if(thisLevel.getMapTile(fila,columna)=="3"){ 

                thisLevel.setMapTile(fila,columna,"0");
                pelletComido(fila,columna,that.nombreSala);//Informamos a los sockets que están conectados.

                thisLevel.pellets-=1; //Contamos también las pildoras de poder
                that.listaPlayers[playerId].points+=10;
                
                if(thisLevel.pellets == 0){
                    
                    passLevel();
                   
                }
                that.thisGame.ghostTimer = 360;
                for(var i=0;i<numGhosts;i++){
                    if (that.ghosts[i].state == Ghost.NORMAL){
                        that.ghosts[i].state = Ghost.VULNERABLE;
                    }
                    
                }
            }
        };
        this.mapaBordes =function(){
            map = [];
            for(var i=0;i<thisLevel.lvlWidth;i++){ //borde superior
                map.push(100);
            }
            for(var i=1;i<thisLevel.lvlHeight-1;i++){
                map.push(100);
                for(var j=1;j<thisLevel.lvlWidth-1;j++){
                    map.push(0);
                }
                map.push(100);
            }
            for(var i=0;i<thisLevel.lvlWidth;i++){ //borde inferior
                map.push(100);
            }
            return map;
        }
        this.processGameOver = function(){ //separar parte calculo posicion fantasmas de dibujado para cliente-servidor
            if(!over){
                over = true;
                thisLevel.map = this.mapaBordes();
                for(var i =0;i<numGhosts;i++){
                    that.ghosts[i].velX=0;
                    that.ghosts[i].velY=-GLOBAL_GHOST_SPEED; //hacia arriba
                    that.ghosts[i].x=that.ghosts[i].baldosaOrigenX*that.thisGame.TILE_WIDTH;
                    that.ghosts[i].y=that.ghosts[i].baldosaOrigenY*that.thisGame.TILE_HEIGHT;
                    that.ghosts[i].state = Ghost.NORMAL;
                }
                that.thisGame.ghostTimer = 0;
            }
            for(var i=0;i<numGhosts;i++){
                that.ghosts[i].move();
            }
        }
    };

    var Pacman = function(id) {
        //this.radius = GLOBAL_TILE_SIDE/2-2;
        this.x = 0;
        this.y = 0;
        //this.angle1 = 0.25;
        //this.angle2 = 1.75;
        this.velX;
        this.velY;
        this.lastDirection = id==0 ? 1 : 3;
        this.id = id;
        this.name = id; //de momento
        this.lifes =3;
        this.points =0;
    };
    Pacman.prototype.move = function() {

        var BaldosaWidth = that.thisGame.TILE_WIDTH;
        var BaldosaHeight = that.thisGame.TILE_HEIGHT;
        var baldosaX = Math.floor(this.x/BaldosaWidth);
        var baldosaY = Math.floor(this.y/BaldosaHeight);
        var balExacta = false;
        if(baldosaX == this.x/BaldosaWidth && baldosaY == this.y/BaldosaHeight){
            balExacta = true;
        }
        if(this.velX!=0||this.velY!=0){ 
            if(this.velX<0){
                this.lastDirection=1;
            }else{
                if(this.velX>0){
                    this.lastDirection=3;
                }else{
                    if(this.velY>0){
                        this.lastDirection=2;
                    }else{
                        this.lastDirection=0;
                    }
                } 
            }
        }
        //corregir movimientos izquierda arriba que hacen que se pare, y que se pare.
        if(this.velX>0){ 
            if(thisLevel.checkIfHitWall(this.x+that.thisGame.TILE_WIDTH+this.velX,this.y)){
                this.velX=0;
                this.velY=0; //opcional, pero evita posibles complicaciones 
                var tilePreWallX = Math.floor((this.x+that.thisGame.TILE_WIDTH+this.velX)/that.thisGame.TILE_WIDTH)*that.thisGame.TILE_WIDTH; //que se pegue a la pared.
                this.x = tilePreWallX; 
            }else{
                this.x=this.x+this.velX;
            }
        }else if(this.velX<0){
            if(thisLevel.checkIfHitWall(this.x+this.velX,this.y)){
                this.velX=0;
                this.velY=0; //opcional, pero evita posibles complicaciones 
                var tilePreWallX = Math.floor((this.x+this.velX)/that.thisGame.TILE_WIDTH)*that.thisGame.TILE_WIDTH; //que se pegue a la pared.
                this.x = tilePreWallX; 
            }else{
                this.x=this.x+this.velX;
            }
        }

        //EJE Y
        if(this.velY>0){
            if(thisLevel.checkIfHitWall(this.x,this.y+that.thisGame.TILE_HEIGHT+this.velY)){
                this.velY=0;
                this.velX=0; //opcional, pero evita posibles complicaciones 
                var tilePreWallY = Math.floor((this.y+that.thisGame.TILE_HEIGHT+this.velY)/that.thisGame.TILE_HEIGHT)*that.thisGame.TILE_HEIGHT; //que se pegue a la pared.
                this.y = tilePreWallY; 
            }else{
                this.y=this.y+this.velY;
            }
        }else if(this.velY<0){
            if(thisLevel.checkIfHitWall(this.x,this.y+this.velY)){
                this.velY=0;
                this.velX=0; //opcional, pero evita posibles complicaciones 
                var tilePreWallY = Math.floor((this.y+this.velY)/that.thisGame.TILE_HEIGHT)*that.thisGame.TILE_HEIGHT; //que se pegue a la pared.
                this.y = tilePreWallY; 
            }else{
                this.y=this.y+this.velY;
            }
        }

        //Esto puede parecer redundante pero corrige fallos en movimiento al cambiar tamaño de baldosa del mapa.
        //Se ha hecho igual en movimiento fantasmas.
        var baldosaXNueva = Math.floor(this.x/BaldosaWidth);
        var baldosaYNueva = Math.floor(this.y/BaldosaHeight);
        if( (baldosaXNueva != baldosaX || baldosaYNueva!=baldosaY) && !balExacta){ //al actualizar posición se cambiaria de casilla. ajustar EXACTA a la que deba ser.
            if(this.velX > 0 || this.velY > 0){
                this.x = baldosaXNueva*BaldosaWidth;
                this.y = baldosaYNueva*BaldosaHeight;
            }else{
                if(this.velX < 0 || this.velY < 0){
                    this.x = baldosaX*BaldosaWidth;
                    this.y = baldosaY*BaldosaHeight;
                }
            }
        }



        // tras actualizar this.x  y  this.y... 
        // check for collisions with other tiles (pellets, etc)
        thisLevel.checkIfHitSomething(this.x, this.y, this.nearestRow, this.nearestCol, this.id);
        //Si chocamos contra un fantasma y su estado es Ghost.VULNERABLE cambiamos velocidad fantasma y lo pasamos a modo Ghost.SPECTACLES
        for(var i =0;i<numGhosts;i++){ //comprobamos si hay contacto con los fantasmas.
            if(thisLevel.checkIfHit(this.x,this.y,that.ghosts[i].x,that.ghosts[i].y,that.thisGame.TILE_WIDTH/2)){
                if(that.ghosts[i].state == Ghost.VULNERABLE){
                    that.ghosts[i].state = Ghost.SPECTACLES;
                    if(that.ghosts[i].velX > 0 ){//actualizamos velocidad X fantasma.
                        that.ghosts[i].velX = GLOBAL_GHOST_VULNERABLE_SPEED;
                    }else{
                        if(that.ghosts[i].velX < 0){
                            that.ghosts[i].velX = -GLOBAL_GHOST_VULNERABLE_SPEED;
                        }
                    }
                    if(that.ghosts[i].velY > 0 ){//actualizamos velocidad Y fantasma.
                        that.ghosts[i].velY = GLOBAL_GHOST_VULNERABLE_SPEED;
                    }else{
                        if(that.ghosts[i].velY < 0){
                            that.ghosts[i].velY = -GLOBAL_GHOST_VULNERABLE_SPEED;
                        }
                    }
                }else{
                    if(that.ghosts[i].state == Ghost.NORMAL){
                        if(that.thisGame.mode != that.thisGame.HIT_GHOST){
                            // Si chocamos contra un fantasma cuando éste esta en estado Ghost.NORMAL --> cambiar el modo de juego a HIT_GHOST
                            that.thisGame.setMode(that.thisGame.HIT_GHOST);
                            if(thisLevel.pellets>0){
                                this.lifes--;
                                
                            }
                            informarVidaAct(this.id,that.nombreSala);
                            //lifesContainer.innerHTML = "Vidas: "+this.lifes;
                            //console.log("player " + this.id + "ha perdido 1 vida, restantes " + this.lifes);

                        }
                        
                    }
                }
            }
            
        }
    };

    this.thisGame = {
        getLevelNum : function(){
            return 0;
        },
        setMode : function(mode) {
            this.mode = mode;
            if(mode == that.thisGame.HIT_GHOST){
                that.thisGame.modeTimer = 90; //90 Frames, 1,5 segundos.

                //congelado = false;
            }
        },
        TILE_WIDTH: GLOBAL_TILE_SIDE, 
        TILE_HEIGHT: GLOBAL_TILE_SIDE,
        ghostTimer: 0,
        NORMAL : 1,
        HIT_GHOST : 2,
        GAME_OVER : 3,
        WAIT_TO_START: 4,
        MENSAJES: 5,
        //FROZEN: 5,

        modeTimer: 0,
        pantalla: undefined,
        //congelado: false
    };




    var getRow = function(y){
        return Math.floor(y/that.thisGame.TILE_HEIGHT);
    }

    var getCol = function(x){
        return Math.floor(x/that.thisGame.TILE_WIDTH);
    }

    var checkInputs = function(){
        //row y col para mirar si se entra demasiado pronto o demasiado tarde por pasillo lateral.
        var velocidadPosible = GLOBAL_PACMAN_VEL;
        for(var i=0;i<2;i++){
            var player = that.listaPlayers[i];
            var inputStates = inputStatesPlayer[i];

            if(inputStates["up"] == true){ //miramos si en el lugar donde se va a mover hay muro.
                if(!thisLevel.checkIfHitWall(player.x,player.y-velocidadPosible,getRow(player.y),getCol(player.x))){
                    player.velY = -velocidadPosible;
                    player.velX = 0;
                }
            }
            if(inputStates["down"] == true){
                if(!thisLevel.checkIfHitWall(player.x,player.y+that.thisGame.TILE_HEIGHT+velocidadPosible,getRow(player.y),getCol(player.x))){
                    if(thisLevel.getMapTile(getRow(player.y+that.thisGame.TILE_HEIGHT),getCol(player.x))!=1){
                        player.velY = velocidadPosible;
                        player.velX = 0;
                    }
                    
                }
            }
            if(inputStates["left"] == true){
                if(!thisLevel.checkIfHitWall(player.x-velocidadPosible,player.y,getRow(player.y),getCol(player.x))){
                    player.velX = -velocidadPosible;
                    player.velY = 0;
                }
            }
            if(inputStates["right"] == true){
                if(!thisLevel.checkIfHitWall(player.x+that.thisGame.TILE_WIDTH+velocidadPosible,player.y,getRow(player.y),getCol(player.x))){
                    player.velX = +velocidadPosible;
                    player.velY = 0;
                }
            }
            if(inputStates["espacio"] == true){//"espacio" in inputStates){
                
                if(that.thisGame.mode == that.thisGame.GAME_OVER || that.thisGame.mode == that.thisGame.MENSAJES){
                    
                    //thisGame.state = thisGame.WAIT_TO_START;
                    //thisGame.modeTimer = 90; 
                    
                    if(Object.getOwnPropertyNames(confirm).length == 0){ 
                        //para que ambos jugadores estén de acuerdo en jugar otra partida al pulsar espacio uno de ellos.

                        confirm.accepta1 = i; // se guarda el id del primero que acepta. (el que quiere volver a jugar)
                        /*enviar info a ambos (al que quiere volver a jugar de "esperando respuesta jugador 2",
                         y al otro: "jugador 2 quiere volver a jugar") (para ambos el jugador 2 es el otro)*/
                        var otro = i==0 ? 1:0;
                        emitirMensajesOtraPartida(i,otro,that.nombreSala);
                    }else{

                        if(confirm.accepta1 != i){ //esto quiere decir que el que ha pulsado espacio es el otro player (el que falta).
                            
                            confirm = {};
                            passLevel();
                            partida(); //no es necesario métod0 emit("partida",{}), se envia continuamente estado a clientes.
                            
                        }
                    }
                }
              //inputStates = {};
            }
        }
    };
    var updateTimers = function(){
        // Actualizamos thisGame.ghostTimer (y el estado de los fantasmas)
        if(that.thisGame.ghostTimer>0){ 
            that.thisGame.ghostTimer--;
            if(that.thisGame.ghostTimer==0){
                for(var i=0;i<numGhosts;i++){
                    if(that.ghosts[i].state == Ghost.VULNERABLE){
                        that.ghosts[i].state = Ghost.NORMAL;
                    }
                }
            }
        }
        // actualizamos modeTimer
         if(that.thisGame.modeTimer>0){ 
            if(that.thisGame.modeTimer==1){
                //that.thisGame.congelado = false;
                //reset();
                that.thisGame.setMode(that.thisGame.NORMAL);
            }else{
                if(that.thisGame.modeTimer==31){ //30Frames, 0,5 Segundos
                    //thisGame.congelado = false;
                    


                    reset();
                    that.thisGame.setMode(that.thisGame.WAIT_TO_START);
                   
                }
            }
            that.thisGame.modeTimer--;
        }
        //if(thisGame.ghostTimer==0){

        //}
    };

    var mainLoop = function(){ //SEPARAMOS PARTES DE CALCULO Y DE DIBUJADO PARA SERVIDOR -CLIENTE 
        setInterval(function(){

            //en modo NORMAL
            if(that.thisGame.mode == that.thisGame.NORMAL){ 
                
                //readInputs();de manera asincrona con eventos.
                // Movemos fantasmas
                for(var i=0;i<numGhosts;i++){
                    that.ghosts[i].move();
                }
                that.listaPlayers[0].move();
                that.listaPlayers[1].move();
            }
            //en modo HIT_GHOST
            if(that.thisGame.mode == that.thisGame.HIT_GHOST){ //pantalla frozen.
                //se debería quedar tod0 parado durande 1.5 segs. (no actualizamos posiciones de nadie).
            }
            //en modo WAIT_TO_START
            if(that.thisGame.mode == that.thisGame.WAIT_TO_START){
                
                //se debería mostrar el pacman en su casilla de inicio y los fantasmas en sus posiciones y tod0 parado durande medio seg.
                //if(thisGame.congelado == false){

                    if(that.listaPlayers[0].lifes==0||that.listaPlayers[1].lifes==0){
                        that.thisGame.setMode(that.thisGame.GAME_OVER);
                    }//else{
                      
                        //thisLevel.preDrawMap();
                        
                //        thisGame.congelado = true;
                //    }
                //}
              
            }
           

            checkInputs();

            if(that.thisGame.mode == that.thisGame.GAME_OVER){ 
                
                //console.log("uno de los dos jugadores ha perdido todas sus vidas. GameOver"); Mostrar el mensaje solo 1 vez..
                //process.exit();//Apagar el servidor.

                thisLevel.processGameOver();//mostramos puntuacion de jugador(es)
                

            }else{
                if(that.thisGame.mode != that.thisGame.MENSAJES){
                     updateTimers(); //si se hace update timers cuando está en modo mensajes se vuelve al modo normal.
                }
            }
            // call the animation loop every 1/60th of second

            sendInfoToSockets(that, that.nombreSala);

            //requestAnimationFrame(mainLoop);
            //mainLoop();
        }, 1000/60);
    };


     var reset = function(){ //al comenzar nueva vida
        // Inicialmente Pacman se mueve en horizontal hacia la derecha

        that.listaPlayers[0].x = columnaPac*that.thisGame.TILE_WIDTH;
        that.listaPlayers[0].y = filaPac*that.thisGame.TILE_HEIGHT;

        that.listaPlayers[1].x = columnaPacDos*that.thisGame.TILE_WIDTH;
        that.listaPlayers[1].y = filaPacDos*that.thisGame.TILE_HEIGHT;

        inputStatesPlayer[0] = {};
        inputStatesPlayer[1] = {};
        that.listaPlayers[0].velY = 0;
        that.listaPlayers[0].velX = -GLOBAL_PACMAN_VEL;
        that.listaPlayers[0].lastDirection = 1;

        that.listaPlayers[1].velY = 0;
        that.listaPlayers[1].velX = GLOBAL_PACMAN_VEL;
        that.listaPlayers[1].lastDirection = 3;
        // Inicializamos los atributos x,y, velX, velY de los fantasmas de forma conveniente
        for(var i =0;i<numGhosts;i++){
            that.ghosts[i].velX=0;
            that.ghosts[i].velY=-GLOBAL_GHOST_SPEED; //hacia arriba
            that.ghosts[i].x=that.ghosts[i].baldosaOrigenX*that.thisGame.TILE_WIDTH;
            that.ghosts[i].y=that.ghosts[i].baldosaOrigenY*that.thisGame.TILE_HEIGHT;
            that.ghosts[i].state = Ghost.NORMAL;
        }
        that.thisGame.ghostTimer = 0;
       
    };

    var passLevel = function(){ //al pasar de nivel (inicialización pellets)
        that.thisGame.modeTimer = 90;
        that.thisGame.setMode(that.thisGame.WAIT_TO_START);

        thisLevel.map = mapaPelletsCargados.slice(); //en la primera ejecucion no es necesario, pero si se reinicia la partida si (o si se pasa nivel)
        thisLevel.pellets = pelletsCargados;
        reinicioMapClients(that.nombreSala);
    }


    var partida = function(){ //al comenzar partida
        that.thisGame.setMode(that.thisGame.WAIT_TO_START); 
        that.thisGame.modeTimer = 30; 
        over = false;
        that.listaPlayers[0].points=0;
        that.listaPlayers[1].points=0;
        reset();
        that.listaPlayers[0].lifes=3;
        that.listaPlayers[1].lifes=3;

        informarVidaAct(0,that.nombreSala); //informamos player0 de que tiene 3 vidas (en cliente en 1ra ejecución no es necesario, pero al reiniciar si).
        informarVidaAct(1,that.nombreSala); // //.

        //passLevel(); //mapa ya está incializado correctamente en la 1ra ejecución, y el nro de pellets tambien.

    }
    var init = function(){ //al iniciar server.
        thisLevel = new Level();
        for (var i=0; i< numGhosts; i++){
            that.ghosts[i] = new Ghost(i);
        }
        thisLevel.loadLevel( that.thisGame.getLevelNum() );
    }


    var start = function(){ //al conectarse 2do jugador
        
        reloj = setTimeout(function esperarCargaMapaYLecturaPosPacman(){
            
            partida();

            // start the animation
            //requestAnimationFrame(mainLoop);
            mainLoop();

        }, 500); 
    }



    this.listaPlayers = [];//jugadores
    var inputStatesPlayer = [];
    var player1 = new Pacman(0);
    var player2 = new Pacman(1);
    that.listaPlayers.push(player1);
    that.listaPlayers.push(player2);
    init(); //el cargado del mapa es asíncrono.

   
    //WS
   

    return{
        start: start,
        thisGame: that.thisGame,
        thisLevel: thisLevel,
        listaPlayers: that.listaPlayers,
        player1: player1,
        player2: player2,
        ghosts: that.ghosts,
        inputStatesPlayer: inputStatesPlayer,
    };
}

//////WS

//var listaConectados = [];//sockets

var listaSalas = []; //salas -> array de salas, una sala es un diccionario del tipo-> sockets: [array sockets], juego: jogo (instancia de GF), nombreSala: nombre.
var listaNombres = []; //nombres salas
var listaNombresOld = []; //search TODOTODO...
//var jogo;


var io=require('socket.io')(serv,{});



io.sockets.on('connection',function(socket){
    //TODO igual conviene asignar a variable jogo listaSalas[posSala]["juego"] y evitar estar ctmente realizando el acceso en array.. (velocidad y eficiencia)


    socket.on("showRooms", function(){
        console.log("Somebody connected to the mainhub");
        salasObj = toObject(listaNombres); //no se puede pasar un array por ws, debe ser un objeto.
        io.emit("rooms",{rooms: salasObj});
    });


    socket.on('createRoom',function(data){
        var nombreSala = data.room;
        nombreSala = nombreSala.replace(/\s/g, '');
        while(listaNombres.indexOf(nombreSala)!==-1 || listaNombresOld.indexOf(nombreSala)!==-1  ){//el nombre de la sala ya existe
            var randomNumber = Math.floor(Math.random()*1000);
            nombreSala = "room_"+randomNumber;
           
        }

        var sala = {"nombre": nombreSala};
        sala["sockets"] = [];

        sala["juego"] = new (GF)(nombreSala);

        listaSalas.push(sala);
        listaNombres.push(nombreSala);
        listaNombresOld.push(nombreSala);
        console.log("New room created: "+nombreSala +".");
        socket.emit("newRoom",{room: nombreSala});
        salasObj = toObject(listaNombres);  //no se puede pasar un array por ws, debe ser un objeto.
        io.emit("rooms",{rooms: salasObj});
    });

    socket.on('joinRoom',function(data){

        /* no necesitamos emitir evento para que el cliente use socket.removeListener para dejar de estar atento a las salas 
        que se crean y se destruyen porque en pacman.js no existen dichos listeners.*/
        socket.room = data.room;
        posSala = listaNombres.indexOf(data.room);
        if(posSala ===-1 ){
            socket.emit("redirect",{});
            return; //la sala no existe.
        }

        socket.join(data.room);
        listaSalas[posSala]["sockets"].push(socket);
        console.log("socket connection into room "+data.room +", " +contarConectados()+ " sockets on line (all rooms)");

        listaConectadosSala = listaSalas[posSala]["sockets"];

        if(listaConectadosSala.length<3){//sólo pueden jugar 2 simultáneamente.
           
            socket.emit("idPlayer",{
                "user":listaConectadosSala.length-1,
            }); //se asigna id al socket que se acaba de conectar
            socket.emit("serverWantsName",{//no necesitamos enviar parametros adicionales
            }); 

            if(listaConectadosSala.length==2){

                io.to(listaSalas[posSala]["nombre"]).emit("start",{//no necesitamos enviar parametros adicionales
                }); 

                listaSalas[posSala]["juego"].start();//COMENZAR PARTIDA
            }
            if(listaConectadosSala.length==1){
                listaSalas[posSala]["juego"].thisGame.setMode(listaSalas[posSala]["juego"].thisGame.MENSAJES);
                socket.emit("waitingStart",{mensaje: "Esperando conexión jugador 2...",modo: listaSalas[posSala]["juego"].thisGame.mode});
                
            }
        }else{
            //Codigo para espectadores.
            socket.emit("start",{//no necesitamos enviar parametros adicionales
                "listaPlayers":listaSalas[posSala]["juego"].listaPlayers
            }); 
            io.to(listaSalas[posSala]["nombre"]).emit("serverInfoNames",{ 
                "name1":listaSalas[posSala]["juego"].player1.name,
                "name2":listaSalas[posSala]["juego"].player2.name
            });
            /*para informar a los espectadores de como está el mapa en el momento
            en el que se conectan y para resetearlo al pasar nivel o reiniciar juego*/
            socket.emit("estadoMapa",{ 
                "mapa":listaSalas[posSala]["juego"].thisLevel.map
            });
        }

    });


    

    socket.on('input',function(data){//no es necesario pasar el idPlayer, podríamos identificarlo por el socket.
        posSala = listaNombres.indexOf(socket.room);
        listaSalas[posSala]["juego"].inputStatesPlayer[data.idPlayer] = data.inputStates;
    });

    socket.on('userName',function(data){
        posSala = listaNombres.indexOf(socket.room);
        if(data.idPlayer ==0){
            listaSalas[posSala]["juego"].player1.name = data.name;
        }else{
            listaSalas[posSala]["juego"].player2.name = data.name;
            //Si el id del user es 1 es el segundo usuario conectado, se les puede informar a ambos del nombre del otro.
             io.to(listaSalas[posSala]["nombre"]).emit("serverInfoNames",{
                "name1":listaSalas[posSala]["juego"].player1.name,
                "name2":listaSalas[posSala]["juego"].player2.name
            });
        }
    });

    

    socket.on('disconnect', function() {
        //socket.room = undefined; //no es necesario.
        //var user = socket.request.connection.remoteAddress;
        //console.log(user +' Got disconnect!');

        if(socket.esclavo){console.log("Socket disconection due to room removed.");return;} //ha recibido la orden de desconectarse manualmente.
        var removeRoom = false;

        for(var j=0;j<listaSalas.length;j++){
            sala = listaSalas[j];
         
            for(var i=0;i<sala["sockets"].length;i++){ //sala es un diccionario con key nombre de la sala y value un array de sockets.
                var socketSala = sala["sockets"][i];
                if(socketSala === socket){
                    if(i===0||i===1){ //el index del socket corresponde con uno de los jugadores. eliminar la sala.
                        removeRoom = true;

                        //paramos el juego (matarlo, no vamos a implementar reconexión.)
                        sala["juego"].thisGame.setMode(sala["juego"].thisGame.MENSAJES);
                        io.to(sala["nombre"]).emit("gameKilled",{mensaje: "Un jugador se ha desconectado. \n Game must be killed."});
                        //podemos usar sala["nombre"] o socket.room

                        for(var k=0;k<sala["sockets"].length;k++){
                            sala["sockets"][k].esclavo = true;
                            sala["sockets"][k].disconnect();
                        }
                       
                        console.log("Socket player disconection.");
                        console.log("One of the players disconected. Game must be killed.");
                      
                    }else{  //el index del socket corresponde con un espectador.
                        sala["sockets"].splice(i,1);
                        console.log("Socket spectator disconected from room " +sala["nombre"]+ ", "+contarConectados()+ " sockets on line (all rooms)");
                    }
                }
            }
            
        }
        if(removeRoom){
            var posSala = listaSalas.indexOf(sala);
            var nombreSala = listaSalas[posSala]["nombre"];
            listaSalas[posSala]["juego"] = null; 
            /*TODOTODO Si se crea juego, 2 sockets en él, uno recarga la página (elimina la sala), 
            vuelve al mainhub y vuelve a crear la sala con el mismo nombre y el otro recarga, comportamiento extraño.
            Solución: mantener nombres salas en array independiente, y que si ya existe el nombre lo sustituya.
            puede que estemos usando de manera incorrecta la memoria, revisar si afecta al comportamiento del servidor 
            tras crearse/eliminarse un gran número de salas...*/
            listaSalas.splice(posSala,1);
            var posNombre = listaNombres.indexOf(nombreSala);
            listaNombres.splice(posNombre,1);
            console.log("Room " +nombreSala+ " has been destroyed. "+contarConectados()+ " sockets on line (all rooms)");
            salasObj = toObject(listaNombres); //no se puede pasar un array por ws, debe ser un objeto.
            io.emit("rooms",{rooms: salasObj});
        }
            //setTimeout(function err(){
            //    throw "juegoFinalizado";
            //}, 100); //para que se emita el evento. Si no se espera un poco no se muestra la pantalla correspondiente en el cliente.
    });

} );



emitirMensajesOtraPartida = function(idWant, idMust,nombreSala){ //idWant = el que quiere repetir, idMust = el que debe responder.
    posSala = listaNombres.indexOf(nombreSala);

    listaSalas[posSala]["sockets"][idWant].emit("waitingScreen",{mensaje: "Esperando respuesta del jugador 2..."});
    listaSalas[posSala]["sockets"][idMust].emit("waitingScreen",{mensaje: "Jugador 2 quiere volver a jugar... \n Pulsa espacio para aceptar."});
    
    listaSalas[posSala]["juego"].thisGame.setMode(listaSalas[posSala]["juego"].thisGame.MENSAJES);
}



reinicioMapClients = function(nombreSala){ //IMPORTANTE. los 2 primeros sockets son los players. 
    posSala = listaNombres.indexOf(nombreSala);

    var players = listaSalas[posSala]["sockets"].slice(0,2);
    players[0].emit("serverMapReestart",{});
    players[1].emit("serverMapReestart",{});

    //para espectadores
    var spectators = listaSalas[posSala]["sockets"].slice(2,listaSalas[posSala]["sockets"].length);
    for(var i =0;i<spectators.length;i++){
        spectators[i].emit("estadoMapa",{ 
            "mapa":listaSalas[posSala]["juego"].thisLevel.map
        });
    }
    
    
}

informarVidaAct = function(id,nombreSala){

    posSala = listaNombres.indexOf(nombreSala);
    listaSalas[posSala]["sockets"][id].emit("vidasActuales",{"vidas": listaSalas[posSala]["juego"].listaPlayers[id].lifes});
}

//informarPtos = function(id){ //Necesario o los informamos continuamente?
//    listaConectados[id].emit("puntosActuales",{"puntos": listaPlayers[id].points});
//}



pelletComido = function(row,col,nombreSala){
    
    io.to(nombreSala).emit("pelletComido",{ 
        "fila":row,
        "columna":col
    });
}


//jogo es una instancia de GF.
sendInfoToSockets = function(jogo,nombreSala){ /*inGame, se envia info de ambos users (pos,vel,state,points), de fantasmas, estado juego 
    
    NO->¿mapa?¿Pellets comidos? si se envia mapa continuamente igual hay sobrecarga o es ineficiente, si no se hace hay que
    añadir lógica en cliente para borrar pellets... (no es elegante...). 
    (se puede poner null cuando no haya cambios e informar cuando se cambie un pellet...)

    EL MAPA lo actualizaremos (los pellets) mediante eventos, cuando se coma un pellet se informará a los sockets conectados con la fila y la columna.
    */

    /*Enviar mapa cuando se conecte un socket para que lo tenga actualizado.*/
    listaPlayers = jogo.listaPlayers;
    ghosts = jogo.ghosts;

    var playUnoX = listaPlayers[0].x;
    var playUnoY = listaPlayers[0].y;
    var playUnoVelX = listaPlayers[0].velX;
    var playUnoVelY = listaPlayers[0].velY;
    var playUnoPoints = listaPlayers[0].points;
    var lastDirUno = listaPlayers[0].lastDirection;

    var playDosX = listaPlayers[1].x;
    var playDosY = listaPlayers[1].y;
    var playDosVelX = listaPlayers[1].velX;
    var playDosVelY = listaPlayers[1].velY;
    var playDosPoints = listaPlayers[1].points;
    var lastDirDos = listaPlayers[1].lastDirection;

    var ghostUnoX = ghosts[0].x;
    var ghostUnoY = ghosts[0].y;
    var ghostUnoSt = ghosts[0].state;
    var ghostDosX = ghosts[1].x;
    var ghostDosY = ghosts[1].y;
    var ghostDosSt = ghosts[1].state;
    var ghostTresX = ghosts[2].x;
    var ghostTresY = ghosts[2].y;
    var ghostTresSt = ghosts[2].state;
    var ghostCuaX = ghosts[3].x;
    var ghostCuaY = ghosts[3].y;
    var ghostCuaSt = ghosts[3].state;
    io.to(nombreSala).emit("it",{ //it de iteración
        "player1": {"x": playUnoX,
                    "y": playUnoY,
                    "velX": playUnoVelX,
                    "velY": playUnoVelY,
                    "points": playUnoPoints,
                    "ld":lastDirUno
                },  
        "player2": {"x": playDosX,
                    "y": playDosY,
                    "velX": playDosVelX,
                    "velY": playDosVelY,
                    "points": playDosPoints,
                    "ld":lastDirDos
                },  
        //lifes se informan cuando haya cambio, id,name 1 vez al conectarse.
        "ghosts":{
            "uno": {"x":ghostUnoX,"y":ghostUnoY,"st":ghostUnoSt},
            "dos": {"x":ghostDosX,"y":ghostDosY,"st":ghostDosSt},
            "tres": {"x":ghostTresX,"y":ghostTresY,"st":ghostTresSt},
            "cuatro": {"x":ghostCuaX,"y":ghostCuaY,"st":ghostCuaSt},
        },
        //"map":thisLevel.map,
        "mode":jogo.thisGame.mode,
        "ghostTimer":jogo.thisGame.ghostTimer
     });
}


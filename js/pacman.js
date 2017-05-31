// Variables globales de utilidad
var canvas = document.querySelector("canvas");
var ctx = canvas.getContext("2d");
var w = canvas.width; //sólo se usan para borrar canvas.
var h = canvas.height;






var socket = io();
// GAME FRAMEWORK 
var GF = function(){
	
	var tamanoNivelWidth =21;
	var tamanoNivelHeight =25; 
	var GLOBAL_TILE_SIDE = 20; //BALDOSAS CUADRADAS //se puede poner a 22,21,etc sin problemas //24
	//var over;
	// variables para contar frames/s, usadas por measureFPS
    var frameCount = 0;
    var lastTime;
    var fpsContainer;
    var pointsContainer;
    var lifesContainer
    var fps; 
    

    var numGhosts = 4;
	var ghostcolor = {};
	var mapaPelletsCargados; //se  usa al pasar el nivel

	ghostcolor[0] = "rgba(255, 0, 0, 255)";
	ghostcolor[1] = "rgba(255, 128, 255, 255)";
	ghostcolor[2] = "rgba(128, 255, 255, 255)";
	ghostcolor[3] = "rgba(255, 128, 0,   255)";
	ghostcolor[4] = "rgba(50, 50, 255,   255)"; // blue, vulnerable ghost
	ghostcolor[5] = "rgba(255, 255, 255, 255)"; // white, flashing ghost

	var listaPlayers = [];//PARA WS
	var idPlayer = null;//PARA WS
	var mensaje ="";
	// hold ghost objects
	var ghosts = {};

    var Ghost = function(id, ctx){
		this.x = 0;
		this.y = 0;
		this.velX = 0;
		this.velY = 0;
		this.state = Ghost.NORMAL;
		this.ctx = ctx;
		this.id = id;

		this.draw = function(){
			var color = ghostcolor[this.id];
			// Nos aseguramos de pintar el fantasma de un color u otro dependiendo del estado del fantasma y de thisGame.ghostTimer
			if(this.state == Ghost.VULNERABLE){
				if(thisGame.ghostTimer>100){
					color = ghostcolor[4];
				}else{//parpadear
					if(thisGame.ghostTimer % 40 >20){
						color = ghostcolor[4];
					}else{
						color = ghostcolor[5];
					}
				}
			}
			// Pintamos cuerpo de fantasma (sólo debe dibujarse cuando el estado del mismo es distinto a Ghost.SPECTACLES)
			if(this.state != Ghost.SPECTACLES){
				var r = GLOBAL_TILE_SIDE/2-3;
				ctx.beginPath();
				strokeStyle = 'black';
				ctx.arc(this.x+thisGame.TILE_WIDTH/2,this.y+thisGame.TILE_HEIGHT/2,r,0,Math.PI,true);
				ctx.lineTo(this.x+thisGame.TILE_WIDTH/2,this.y+thisGame.TILE_HEIGHT);
				ctx.closePath();
				ctx.lineWidth = 4;
				ctx.stroke();  
				ctx.fillStyle = color; 
			    ctx.fill();
			}
			// Pintamos ojos 
			ctx.beginPath();
			ctx.arc(this.x+thisGame.TILE_WIDTH/2-thisGame.TILE_WIDTH/6,this.y+thisGame.TILE_HEIGHT/2,1,0,Math.PI*2,true);
			ctx.closePath();
			ctx.lineWidth = 1;
			ctx.stroke(); 
			ctx.fillStyle = 'white';
		    ctx.fill();
		    ctx.beginPath();
			ctx.arc(this.x+thisGame.TILE_WIDTH/2+thisGame.TILE_WIDTH/6,this.y+thisGame.TILE_HEIGHT/2,1,0,Math.PI*2,true);
			ctx.closePath();
			ctx.lineWidth = 1;
			ctx.stroke(); 
			ctx.fillStyle = 'white';
		    ctx.fill();
 
		}; // draw
		//move y métodos dependientes en lado del servidor (cálculos).

	}; // fin clase Ghost

	// static variables
	Ghost.NORMAL = 1;
	Ghost.VULNERABLE = 2;
	Ghost.SPECTACLES = 3;

	var Level = function(ctx) {
		this.ctx = ctx;
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
		// leemos res/levels/1.txt y lo guardamos en el atributo map con setMapTile
		$.get("../res/levels/1.txt", function(data){ //estaría mejor pedirselo al server, puesto que si se conecta un espectador no ve el mapa actualizado. 
			var lineas = data.split("\n");
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
						ghosts[0].baldosaOrigenX = j;
						ghosts[0].baldosaOrigenY = numFila;
					}
					if(arrayFilas[numFila][j] == "11"){
						ghosts[1].baldosaOrigenX = j;
						ghosts[1].baldosaOrigenY = numFila;
					}
					if(arrayFilas[numFila][j]== "12"){
						ghosts[2].baldosaOrigenX = j;
						ghosts[2].baldosaOrigenY = numFila;
						casaXBaldosa = j; //inicializamos casilla "casa" de los fantasmas.
						casaYBaldosa = numFila;
					}
					if(arrayFilas[numFila][j] == "13"){
						ghosts[3].baldosaOrigenX = j;
						ghosts[3].baldosaOrigenY = numFila;
					}
	    		}
    		}
		}, 'text'); //Importantísimo, sin esto lo interpreta como html o xml y da error.
		
	};
	//mapa estrella en el lado del servidor (usado para cálculos en los movimientos de los fantasmas al ser vulnerables).
	this.preDrawMap = function(){
    	var TILE_WIDTH = thisGame.TILE_WIDTH;
    	var TILE_HEIGHT = thisGame.TILE_HEIGHT;
		for(var i=0;i<thisLevel.map.length;i++){
			fila = Math.floor(i/thisLevel.lvlWidth);
			columna = i%thisLevel.lvlWidth;
			tile = thisLevel.getMapTile(fila,columna);
			if(tile==1){//puerta fantasmas
				ctx.beginPath();
				ctx.rect(columna*TILE_WIDTH,fila*TILE_HEIGHT,TILE_WIDTH,TILE_HEIGHT/8);
				ctx.fillStyle = 'blue'; 
			    ctx.fill();  
			    ctx.closePath();
			    ctx.beginPath();
				ctx.rect(columna*TILE_WIDTH,fila*TILE_HEIGHT+TILE_HEIGHT/4,TILE_WIDTH,TILE_HEIGHT/8);
				ctx.fillStyle = 'blue'; 
			    ctx.fill();  
			    ctx.closePath();
			    ctx.beginPath();
				ctx.rect(columna*TILE_WIDTH,fila*TILE_HEIGHT+TILE_HEIGHT/2,TILE_WIDTH,TILE_HEIGHT/8);
				ctx.fillStyle = 'blue'; 
			    ctx.fill();  
			    ctx.closePath();
			    ctx.beginPath();
				ctx.rect(columna*TILE_WIDTH,fila*TILE_HEIGHT+TILE_HEIGHT/4*3,TILE_WIDTH,TILE_HEIGHT/8);
				ctx.fillStyle = 'blue'; 
			    ctx.fill();  
			    ctx.closePath();
			}
			if(tile==21 || tile==20){//teletransporte
				ctx.beginPath();
				ctx.rect(columna*TILE_WIDTH,fila*TILE_HEIGHT,TILE_WIDTH,TILE_HEIGHT);
				ctx.fillStyle = 'black'; 
			    ctx.fill();  
			    ctx.closePath();
			}
		}
	}

    this.drawMap = function(){

    	var TILE_WIDTH = thisGame.TILE_WIDTH;
    	var TILE_HEIGHT = thisGame.TILE_HEIGHT;

		var tileID = {
	    		'door-h' : 20,
			'door-v' : 21,
			'pellet-power' : 3
		};
		var fila;
		var columna;

		for(var i=0;i<thisLevel.map.length;i++){
			thisLevel.powerPelletBlinkTimer+=1;
			if(thisLevel.powerPelletBlinkTimer>60*60*2){thisLevel.powerPelletBlinkTimer=0;}
			fila = Math.floor(i/thisLevel.lvlWidth);
			columna = i%thisLevel.lvlWidth;
			tile = thisLevel.getMapTile(fila,columna);
			switch(tile){
				case "2":{//pellet
					ctx.beginPath();
					ctx.rect(columna*TILE_WIDTH,fila*TILE_HEIGHT,TILE_WIDTH,TILE_HEIGHT);
				    ctx.fillStyle = 'black'; 
				    ctx.fill();  
				    ctx.closePath();

					ctx.beginPath();
					strokeStyle = 'black';
				    ctx.arc(columna*TILE_WIDTH+TILE_WIDTH/2,fila*TILE_HEIGHT+TILE_HEIGHT/2,TILE_HEIGHT/5,0,2*Math.PI,false);
				    ctx.lineWidth = 2;
				    ctx.fillStyle = 'white'; 
				    ctx.fill();  
				    ctx.closePath();
				    break; 
				}
				case "3":{//pellet powah'

					ctx.beginPath();
					ctx.rect(columna*TILE_WIDTH,fila*TILE_HEIGHT,TILE_WIDTH,TILE_HEIGHT);
				    ctx.fillStyle = 'black'; 
				    ctx.fill();  
				    ctx.closePath();

					if(thisLevel.powerPelletBlinkTimer<30*60*2){
						ctx.beginPath();
						strokeStyle = 'black';
					    ctx.arc(columna*TILE_WIDTH+TILE_WIDTH/2,fila*TILE_HEIGHT+TILE_HEIGHT/2,TILE_HEIGHT/4,0,2*Math.PI,false);
					    ctx.lineWidth = 2;
					    ctx.stroke();
					    ctx.fillStyle = 'red'; 
					    ctx.fill();  
					    ctx.closePath();
					}
				    break; 
				}

				case "20":{//"portal" de derecha a izquierda o viceversa
					ctx.fillStyle = "rgba(0,0,0,0)";
					ctx.beginPath();
					ctx.rect(columna*TILE_WIDTH,fila*TILE_HEIGHT,TILE_WIDTH,TILE_HEIGHT);
				    ctx.fill();  
				    ctx.closePath();
					break;
				}
				case "21":{//"portal" de abajo a arriba o viceversa
					ctx.fillStyle = 'rgba(0,0,0,0)';
					ctx.beginPath();
					ctx.rect(columna*TILE_WIDTH,fila*TILE_HEIGHT,TILE_WIDTH,TILE_HEIGHT);
				    ctx.fill();  
				    ctx.closePath();
					break;
				}
				case "0":{//casilla vacia
					ctx.beginPath();
					ctx.rect(columna*TILE_WIDTH,fila*TILE_HEIGHT,TILE_WIDTH,TILE_HEIGHT);
					ctx.fillStyle = "black";//"rgba(0,0,0,0)";
				    ctx.fill();  
				    ctx.closePath();
					break;
				}
				case "1":{//puerta de los fantasmas //se pinta en pre drawMap para quedar por debajo de fantasmas.
					
					ctx.beginPath();
					ctx.rect(columna*TILE_WIDTH,fila*TILE_HEIGHT,TILE_WIDTH,TILE_HEIGHT);
					ctx.fillStyle = 'black'; 
				    ctx.fill();  
				    ctx.closePath();
			
				    break;
				}
				case "10":{//fantasma1   //el flujo baja hasta el código del pacman, en posiciones del pacman y fantasmas pintar baldosa negra.
				}
				case "11":{//fantasma2
				}
				case "12":{//fantasma3
				}
				case "13":{//fantasma4
				}
				case "4":{//(id0 jugador1, mrspacman)
					ctx.beginPath();
					ctx.rect(columna*TILE_WIDTH,fila*TILE_HEIGHT,TILE_WIDTH,TILE_HEIGHT);
					ctx.fillStyle = 'black'; 
				    ctx.fill();  
				    ctx.closePath();
					break;
				}
				case "5":{//(id1 jugador2, pacman)
					ctx.beginPath();
					ctx.rect(columna*TILE_WIDTH,fila*TILE_HEIGHT,TILE_WIDTH,TILE_HEIGHT);
					ctx.fillStyle = 'black'; 
				    ctx.fill();  
				    ctx.closePath();
					break;
				}
				default:
					//Resto nros interpretados como pared, (del 100 al 199).
					ctx.beginPath();
					ctx.rect(columna*TILE_WIDTH,fila*TILE_HEIGHT,TILE_WIDTH,TILE_HEIGHT);
					ctx.fillStyle = 'blue'; 
				    ctx.fill();  
				    ctx.closePath();
					break;
				
			}
		}
	};

	this.isWall = function(row, col) { 
		var tile = thisLevel.getMapTile(row,col);
		tile = parseInt(tile, 10);
		var wall = false;
		if(tile>=100 && tile <=199){
			wall = true;
		}
		//if(isNaN(tile)){//fuera del mapa (No nos es necesario)
		//	wall=true;
		//}
		if(tile==11||tile==13){
			wall=true;
		}
		return wall;
	};

	/*en server.
	this.checkIfHitWall = function(possiblePlayerX, possiblePlayerY, row, col){
		// Determinar si el jugador va a moverse a una fila,columna que tiene pared 
		var colision = false;
		//se comprueba si hay colisión al moverse normalmente, movimiento rectilíneo uniforme, sin pulsar tecla
		if(row == null && col == null){ 
			columna = Math.floor(possiblePlayerX / thisGame.TILE_WIDTH);
			fila = Math.floor(possiblePlayerY / thisGame.TILE_HEIGHT);
			if(thisLevel.isWall(fila,columna)){
				colision = true;
			}
		}else{
			//codigo para mirar si hay colision al pulsar tecla, row y col solo se pasan si se pulsa tecla
			
			columna = Math.floor(possiblePlayerX / thisGame.TILE_WIDTH); 
			fila = Math.floor(possiblePlayerY / thisGame.TILE_HEIGHT);

			if(thisLevel.isWall(fila,columna)){
				colision = true;
			}else{
				if(columna == col){ //pacman moviendose en eje vertical y se pulsa tecla arriba ó abajo.
					if(possiblePlayerX!=col*thisGame.TILE_WIDTH){//si las coordenadas de la columna a la que se entra no coinciden exactamente colisión.
						colision = true;
					}
				}else{	
					if(fila == row){  //pacman moviendose en eje horizontal y se pulsa tecla derecha o izquierda.
						if(possiblePlayerY!=row*thisGame.TILE_HEIGHT){//si las coordenadas de la fila a la que se entra no coinciden exactamente colisión.
							colision = true;
						}
					}else{	
						console.log("comportamiento inesperado");
						console.log(possiblePlayerX +" , "+possiblePlayerY);
					}

				}
			}
		}
		//Colision con fantasmas se mira en método move.
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
	*/

	/*this.checkIfHitSomething = function(playerX, playerY, row, col){ //en server.
		var tileID = {
    		'door-h' : 20,
			'door-v' : 21,
			'pellet-power' : 3,
			'pellet': 2
		};

		//  Gestiona la recogida de píldoras
		columna = Math.floor(playerX / thisGame.TILE_WIDTH); 
		fila = Math.floor(playerY / thisGame.TILE_HEIGHT);
		//No se hace USO DE ROW Y COL
		if(columna==playerX / thisGame.TILE_WIDTH && fila==playerY / thisGame.TILE_HEIGHT){
			/*igual se puede mejorar, pues no se come la pildora hasta que se está totalmente encima, 
			pero es visualmente igual en todas direcciones*/
			/*
			if(thisLevel.getMapTile(fila,columna)=="2"){ 
				thisLevel.setMapTile(fila,columna,"0");
				thisLevel.pellets-=1; 
				player.points+=10;
				pointsContainer.innerHTML = "Puntos: "+player.points;
				if(thisLevel.pellets == 0){
					thisGame.modeTimer = 90; //en server.
					thisLevel.pellets = pelletsCargados; //en server.
					thisLevel.map = mapaPelletsCargados.slice();  //en server.
					thisGame.setMode(thisGame.WAIT_TO_START);  //en server.

				}
			}
		}

		//  Gestiona las puertas teletransportadoras
		if(thisLevel.getMapTile(fila,columna)=="20"){ //|| thisLevel.getMapTile(fila,columna+1)=="20"){  // || para detectar antes puerta lateral derecha. (y pasar el test.)
			if(columna==playerX / thisGame.TILE_WIDTH && fila==playerY / thisGame.TILE_HEIGHT){
				if(getCol(playerX)==0){//"teletransporte" de izquierda a derecha
					player.x = thisLevel.lvlWidth * thisGame.TILE_WIDTH-1-2*thisGame.TILE_WIDTH; //2* para evitar bucle debido a detectar antes puerta lateral derecha.
					player.velX = -GLOBAL_PACMAN_VEL;
				}else{//"teletransporte" de derecha a izquierda
					player.x = 1+thisGame.TILE_WIDTH;
					player.velX = GLOBAL_PACMAN_VEL;
				}
			}
			
		}
		if(thisLevel.getMapTile(fila,columna)=="21"){//|| thisLevel.getMapTile(fila+1,columna)=="21"){ // || para detectar antes puerta inferior. (y pasar el test.)
			if(columna==playerX / thisGame.TILE_WIDTH && fila==playerY / thisGame.TILE_HEIGHT){
				if(getRow(playerY)==0){//"teletransporte" de arriba a abajo
					player.y = thisLevel.lvlHeight* thisGame.TILE_HEIGHT-1-2*thisGame.TILE_HEIGHT; //2* para evitar bucle debido a detectar antes puerta inferior.
					player.velY = -GLOBAL_PACMAN_VEL;
				}else{//"teletransporte" de abajo a arriba

					player.y = 1+thisGame.TILE_HEIGHT;
					player.velY = GLOBAL_PACMAN_VEL;
				}
			}
		}
		// Gestionamos la recogida de píldoras de poder (cambiamos estado de los fantasmas)
		if(thisLevel.getMapTile(fila,columna)=="3"){ 
			thisLevel.setMapTile(fila,columna,"0");
			thisLevel.pellets-=1; //Contamos también las pildoras de poder
			player.points+=10;
			pointsContainer.innerHTML = "Puntos: " +player.points;
			if(thisLevel.pellets == 0){
				thisGame.modeTimer = 90;
				thisLevel.map = mapaPelletsCargados.slice();
				thisLevel.pellets = pelletsCargados;
				thisGame.setMode(thisGame.WAIT_TO_START);
			}
			thisGame.ghostTimer = 360;
			for(var i=0;i<numGhosts;i++){
				if (ghosts[i].state == Ghost.NORMAL){
					ghosts[i].state = Ghost.VULNERABLE;
				}
				
			}
		}
	};*/
	
	//mapaBordes en servidor
	
	this.drawGameOver = function(){  //separamos parte calculo posicion fantasmas de dibujado para servidor- cliente
		
		//parte de cálculos de posiciones sacada al servidor.
		ctx.clearRect(0, 0, w, h);
		for(var i=0;i<numGhosts;i++){
			ghosts[i].draw();
		}
		ctx.fillStyle = 'black'; 
		ctx.font = "30px Arial";
		ctx.fillText("Press space to restart!",55,70);
		ctx.font = "25px Arial";
		ctx.fillText("Puntuaciones: ",60,130);
		ctx.font = "20px Arial";
		for(var i=0;i<listaPlayers.length;i++){
			ctx.fillText(listaPlayers[i].name +" : "+ listaPlayers[i].points,70,170+25*i);
		}
	}

	this.drawMensaje = function(){  
		
		ctx.clearRect(0, 0, w, h);
		ctx.fillStyle = "black";
		ctx.beginPath();
		ctx.rect(0,0,w,h);
	    ctx.fill();  
	    ctx.closePath();
		ctx.fillStyle = 'white'; 
		ctx.font = "20px Arial";
		var arrayMensaje = mensaje.split('\n');
		ctx.fillText(arrayMensaje[0],40,70);
		if(arrayMensaje[1]){
			ctx.fillText(arrayMensaje[1],40,110);
		}
		
	}

	}; // end Level 

	var Pacman = function(id) {
		this.radius = GLOBAL_TILE_SIDE/2-2;
		this.x = 0;
		this.y = 0;
		this.angle1 = 0.25;
		this.angle2 = 1.75;
		this.velX;
		this.velY;
		this.lastDirection = id==0 ? 1 : 3;//sólo en la inicialización
		this.id = id;
		this.name; //de momento
		this.lifes =3;
		this.points =0;
	};
	//método move sacado al servidor (cálculos).

	// Función para pintar el Pacman
	Pacman.prototype.draw = function(x, y) {  
	    y = this.y;
	 	x = this.x;
	    r = this.radius; 
	    dx = thisGame.TILE_WIDTH - 2*r; //para centrarlo en el bloque en la coordenada x.
	    dx = dx/2;
	    dy = thisGame.TILE_HEIGHT - 2*r; //para centrarlo en el bloque en la coordenada y.
	    dy = dy/2;
	    ctx.beginPath();
		strokeStyle = 'black';
		//calculo de lastDirection sacado al servidor al método move 
			
		switch(this.lastDirection){
			case 0: ctx.arc(x+r+dx,y+r+dy,r,(this.angle1+1.5)*Math.PI,(this.angle2+1.5)*Math.PI,false); ctx.lineTo(x+r+dx,y+r+dy); break; //arriba
			case 1: ctx.arc(x+r+dx,y+r+dy,r,(this.angle1+1)*Math.PI,(this.angle2+1)*Math.PI,false); ctx.lineTo(x+r+dx,y+r+dy); break; //izquierda
			case 2: ctx.arc(x+r+dx,y+r+dy,r,(this.angle1+0.5)*Math.PI,(this.angle2+0.5)*Math.PI,false); ctx.lineTo(x+r+dx,y+r+dy); break; //abajo
			case 3: ctx.arc(x+r+dx,y+r+dy,r,this.angle1*Math.PI,this.angle2*Math.PI,false); ctx.lineTo(x+r+dx,y+r+dy); break; //derecha
		}
	    ctx.closePath();
	    ctx.lineWidth = 4;
	    ctx.stroke();
	    ctx.fillStyle = 'yellow';
	    ctx.fill();      
	    if(this.id==0){//lazo

		    switch(this.lastDirection){
				case 0: 
					ctx.beginPath();ctx.moveTo(x +r/2,y+thisGame.TILE_HEIGHT); ctx.lineTo(x+r/2,y+thisGame.TILE_HEIGHT-r);ctx.lineTo( x+r,y+thisGame.TILE_HEIGHT-r/2); 
					ctx.lineTo(x,y+thisGame.TILE_HEIGHT-r/2);ctx.closePath();ctx.fillStyle = 'red';ctx.fill();break; //arriba
				case 1: 
					ctx.beginPath();ctx.moveTo(x +thisGame.TILE_WIDTH-r/2,y+r); ctx.lineTo(x+thisGame.TILE_WIDTH-r/2,y);ctx.lineTo(x+thisGame.TILE_WIDTH,y+r/2); 
					ctx.lineTo(x+thisGame.TILE_WIDTH-r,y+r/2);ctx.closePath();ctx.fillStyle = 'red';ctx.fill();break; //izquierda
				case 2: 
					ctx.beginPath();ctx.moveTo(x +thisGame.TILE_WIDTH-r/2,y+r); ctx.lineTo(x+thisGame.TILE_WIDTH-r/2,y);ctx.lineTo(x+thisGame.TILE_WIDTH,y+r/2); 
					ctx.lineTo(x+thisGame.TILE_WIDTH-r,y+r/2);ctx.closePath();ctx.fillStyle = 'red';ctx.fill();break; //abajo
				case 3: 
					ctx.beginPath();ctx.moveTo(x +r/2,y+r); ctx.lineTo(x+r/2,y);ctx.lineTo(x,y+r/2); 
					ctx.lineTo(x+r,y+r/2);ctx.closePath();ctx.fillStyle = 'red';ctx.fill();break; //derecha
			}  
		}
    };//end Pacman

	

	var thisGame = {
		getLevelNum : function(){
			return 0;
		},
	    setMode : function(mode) {
			this.mode = mode;
			if(mode == thisGame.HIT_GHOST){
				//thisGame.modeTimer = 90; //90 Frames, 1,5 segundos. NO SE USA EN CLIENTE
				congelado = false;
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
		//modeTimer: 0, NO SE USA EN CLIENTE.
		//pantalla: undefined,
		congelado: false
	};

	

	var measureFPS = function(newTime){
		// la primera ejecución tiene una condición especial

		if(lastTime === undefined) {
			lastTime = newTime; 
			return;
		}
		// calcular el delta entre el frame actual y el anterior
		var diffTime = newTime - lastTime; 

		if (diffTime >= 1000) {

			fps = frameCount;    
			frameCount = 0;
			lastTime = newTime;
		}

		// mostrar los FPS en su capa 
		fpsContainer.innerHTML = 'FPS: ' + fps; 
		frameCount++;
	};

	// clears the canvas content
	var clearCanvas = function() {
		ctx.clearRect(0, 0, w, h);
	};

	//getRow ^ getCol no son necesarios en clientes.
	
	//checkInputs  los inputs se comprueban en el servidor.
		
    
        
    var mainLoop = function(time){ //SEPARAMOS PARTES DE CALCULO Y DE DIBUJADO PARA SERVIDOR-CLIENTE 
    	measureFPS(time);
    	//getInfoServer(); //No es necesario, recibimos la información de manera asincrona en evento "it" (de iteración)

		//en modo HIT_GHOST
		if(thisGame.mode == thisGame.HIT_GHOST){ //Frozen
			//se debería quedar todo parado durande 1.5 segs.
			
			//if(thisGame.congelado == false){
			//	thisGame.pantalla = ctx.getImageData(0,0,thisGame.TILE_WIDTH*thisLevel.lvlWidth,thisGame.TILE_HEIGHT*thisLevel.lvlHeight);

			//	thisGame.congelado = true;
			//}
			clearCanvas();
			thisLevel.drawMap();
			listaPlayers[0].draw();
			listaPlayers[1].draw();
			for(var i=0;i<numGhosts;i++){
				ghosts[i].draw();
			}
			thisLevel.preDrawMap();
			//ctx.putImageData(thisGame.pantalla,0,0);
		}
		//en modo WAIT_TO_START
		if(thisGame.mode == thisGame.WAIT_TO_START){
			
			//se debería mostrar el pacman en su casilla de inicio y los fantasmas en sus posiciones y todo parado durande medio seg.
			//if(thisGame.congelado == false){
				//if(listaPlayers[0].lifes==0 || listaPlayers[1].lifes==0){ //en el server.
				//	thisGame.setMode(thisGame.GAME_OVER); 
				//}else{
					clearCanvas();
					//se ha hecho reset cuando quedan 30 Frames para volver a empezar en updateTimers.
					thisLevel.drawMap();
					listaPlayers[0].draw();
					listaPlayers[1].draw();
					for(var i=0;i<numGhosts;i++){
						ghosts[i].draw();
					}

					thisLevel.preDrawMap();
				//	thisGame.pantalla = ctx.getImageData(0,0,thisGame.TILE_WIDTH*thisLevel.lvlWidth,thisGame.TILE_HEIGHT*thisLevel.lvlHeight);
				//	thisGame.congelado = true;
				//}
			//}
			//ctx.putImageData(thisGame.pantalla,0,0);		
		}
		if(thisGame.mode == thisGame.NORMAL){ 
			// Clear the canvas
			clearCanvas();
			thisLevel.drawMap();
			// Pintamos fantasmas
			for(var i=0;i<numGhosts;i++){
				ghosts[i].draw();
			}
			listaPlayers[0].draw();
			listaPlayers[1].draw();
			thisLevel.preDrawMap();
		} 

		//checkInputs(); //SERVER SIDE

		if(thisGame.mode == thisGame.GAME_OVER){ 
		
			thisLevel.drawGameOver();
			//mostrar puntuacion de jugador(es)
			//comenzar partida de nuevo al pulsar tecla.
		}else{

			//updateTimers(); 
			/* El parpadeo de los fantasmas se podría gestionar en el cliente 
			(puesto que es puramente visual) al recibir evento del server. Actualmente se recibe continuamente el timer de los fantasmas.*/ 
		}
		if(thisGame.mode == thisGame.MENSAJES){
			thisLevel.drawMensaje();
		}
		// call the animation loop every 1/60th of second
		requestAnimationFrame(mainLoop);

    };



    
    //reset //al comenzar nueva vida //posiciones fantasmas y player se reinician en servidor.
	

    var thisLevel = new Level(canvas.getContext("2d"));

	thisLevel.loadLevel( thisGame.getLevelNum() ); // si un espectador se conecta tarde cargará el mapa con todos los pellets...

	//var inputStatesPlayer = [];

	var player1 = new Pacman(0);
	var player2 = new Pacman(1);
	listaPlayers.push(player1);
	listaPlayers.push(player2);
	for(var i=0; i< numGhosts; i++){
       ghosts[i] = new Ghost(i);
    }

	var partida = function(){ //al comenzar partida
		//puntuaciones, vidas jugadores, modo de juego (estado), variable over, temporizador modo, se inician en server. 

		

		if(idPlayer!=null){//para excluir espectadores
			lifesContainer.innerHTML = "Vidas: "+listaPlayers[idPlayer].lifes;
   			pointsContainer.innerHTML = "Puntos: "+listaPlayers[idPlayer].points;
   			addListeners();
   			mapaPelletsCargados = thisLevel.map.slice();
		}
		
   		//thisLevel.map = mapaPelletsCargados.slice(); //en la primera ejecucion no es necesario, pero si se reinicia la partida si
   		//thisLevel.pellets = pelletsCargados;

	}

    var start = function(){ //al cargar página
        canvas.width = thisGame.TILE_WIDTH*tamanoNivelWidth; //trampeado, se debería usar thisLevel.lvlWidth
        canvas.height = thisGame.TILE_HEIGHT*tamanoNivelHeight;
        w = canvas.width; //sólo se usan para borrar canvas.
		h = canvas.height;
		
		// adds a div for displaying the fps value
        fpsContainer = document.getElementById("fps");// createElement('div');
        lifesContainer = document.getElementById("vidas");
        pointsContainer = document.getElementById("puntuacion");
        statusContainer = document.getElementById("status");

        for (var i=0; i< numGhosts; i++){
			ghosts[i] = new Ghost(i, canvas.getContext("2d"));
		}
		
        requestAnimationFrame(mainLoop); 
    };

    



	

	//+++++++WS


	var addListeners = function(){
	    //add the listener to the main, window object, and update the states
	    document.addEventListener('keydown', function(event) {
	      if(event.keyCode == 37) {
	      	inputStates = {};
	        inputStates["left"] = true;
	        if(idPlayer==0||idPlayer==1){
		        socket.emit("input",{ //se puede sacar, pero se enviaria info con inputStates "{}" al pulsar teclas random.. "
		        	"idPlayer":idPlayer,
		        	"inputStates":inputStates
		        });
	        }
	      }
	      else if(event.keyCode == 38) {
	      	inputStates = {};
	        inputStates["up"] = true;
	        if(idPlayer==0||idPlayer==1){
	        /*para evitar que espectadores puedan saturar server enviando pulsaciones. 
	        Redundante puesto que en DOM de espectadores no se añade este event listener.*/
	        	socket.emit("input",{
	        	"idPlayer":idPlayer,
	        	"inputStates":inputStates
	        	});
	        }
	      }
	      else if(event.keyCode == 39) {
	      	inputStates = {};
	        inputStates["right"] = true;
			if(idPlayer==0||idPlayer==1){
		        socket.emit("input",{
		        	"idPlayer":idPlayer,
		        	"inputStates":inputStates
		        });
		    }
	      }
	      else if(event.keyCode == 40) {
			inputStates = {};
			inputStates["down"] = true;
			if(idPlayer==0||idPlayer==1){
				socket.emit("input",{
		        	"idPlayer":idPlayer,
		        	"inputStates":inputStates
		        });
		    }
	      }
	      else if(event.keyCode == 32) {
	      	inputStates = {};
			inputStates["espacio"] = true;
			if(idPlayer==0||idPlayer==1){
				socket.emit("input",{
					"idPlayer":idPlayer,
					"inputStates":inputStates
		        });
		    }
	      }
		});
	};


	
	socket.on("start",function(data){
		
	
		if(data.listaPlayers!=null){//solo se informa para espectadores.
			listaPlayers[0].name= data.listaPlayers[0].name; 
			listaPlayers[1].name= data.listaPlayers[1].name; 
			//console.log(listaPlayers);
			//console.log(listaPlayers[0]);
		}
		
		reloj = setTimeout(function esperarCargaMapaYLecturaPosPacman(){
			pelletsCargados = thisLevel.pellets;
			mapaPelletsCargados = thisLevel.map.slice();
			
			partida();


			// start the animation
	    	//requestAnimationFrame(mainLoop); 
	    	/*LO SACAMOS A START, PORQUE EL BUCLE PUEDE FUNCIONAR ANTES DE QUE COMIENCE EL JUEGO (p.e mensaje de.: esperando player2) */
	    
	    	//thisLevel.cargarMapaEstrella();

		}, 500); 
		/*esperamos a conocer la fila y columna del pacman para establecer 
		sus coordenadas en el método reset, y tras cargar sus coordenadas comenzar el juego.
		Lo mismo para copiar el mapa al comienzo.*/
	
	});

	//function getOwnData(){
		socket.on("idPlayer",function(data){  //Asincrono, es un gestor de evento.
			if(idPlayer===null){//comprobación innecesaria, player nunca va a recibir 2 veces este evento.
				idPlayer = data.user;
			}
			
		});
	//}

	socket.on("serverInfoNames",function(data){
	 	player1.name = data.name1;
	 	player2.name = data.name2;
	 	if(player1.name==undefined ||player1.name ==""){if(player1.id==0){player1.name = "Mrs. Pacman"}else{player1.name = "Pacman"}}
	 	if(player2.name==undefined ||player2.name ==""){if(player2.id==0){player2.name = "Mrs. Pacman"}else{player2.name = "Pacman"}}

	 	/*
	 	console.log("I am the player with id: " + idPlayer);
	 	console.log("The player1 its called: " + player1.name);
	 	console.log("The player2 its called: "+player2.name);
	 	*/
	});
	 
	socket.on("serverMapReestart",function(data){ //servidor informa que hay que reiniciar mapa (se pasa de nivel o se reinicia juego)
	 	thisLevel.map = mapaPelletsCargados.slice();
	});

	socket.on("serverWantsName",function(data){ 

		var name = localStorage.getItem("pacman_name"); 
	 	socket.emit("userName",{
	 		"idPlayer":idPlayer,
	 		"name":name
	 	});
	});

	socket.on("estadoMapa",function(data){ 
		/*probablemente se carge antes del cargado del txt del mapa con jquery (ajax, asíncrono), y este listener 
		del evento "estadoMapa" lo sobreescribe. revisar. En ocasiones parece que funciona erroneamente y en otras correctamente.*/
		
	 	thisLevel.map = data.mapa;

	});

	socket.on("vidasActuales",function(data){ //actualizamos vidas
		
		lifesContainer.innerHTML = "Vidas: "+data.vidas;

	});
	socket.on("waitingScreen",function(data){
		mensaje = data.mensaje;
	});
	socket.on("gameKilled",function(data){
		thisGame.setMode(thisGame.MENSAJES);
		mensaje = data.mensaje;
	});
	socket.on("waitingStart",function(data){
		mensaje = data.mensaje;
		thisGame.setMode(data.modo);
	});

	socket.on("pelletComido",function(data){ 
	
 		thisLevel.setMapTile(data.fila,data.columna,"0");

	});

	//function getInfoServer(){
		socket.on("it",function(data){//iteracion, la info en cada iteración
	        player1.x = data.player1.x;
	        player1.y = data.player1.y;
	        player1.velX = data.player1.velX;
	        player1.velY = data.player1.velY;
	        player1.points = data.player1.points;
	        player1.lastDirection = data.player1.ld;
	        
	        player2.x = data.player2.x;
	        player2.y = data.player2.y;
	        player2.velX = data.player2.velX;
	        player2.velY = data.player2.velY;
	        player2.points = data.player2.points;
	        player2.lastDirection = data.player2.ld;
	        if(idPlayer==0||idPlayer==1){
	        	pointsContainer.innerHTML = "Puntos: "+listaPlayers[idPlayer].points; 
	        }
	        

	        ghosts[0].x = data.ghosts.uno.x; 
        	ghosts[0].y = data.ghosts.uno.y;
        	ghosts[0].state = data.ghosts.uno.st;
    	    ghosts[1].x = data.ghosts.dos.x; 
        	ghosts[1].y = data.ghosts.dos.y;
        	ghosts[1].state = data.ghosts.dos.st;
    	    ghosts[2].x = data.ghosts.tres.x; 
        	ghosts[2].y = data.ghosts.tres.y;
        	ghosts[2].state = data.ghosts.tres.st;
    	    ghosts[3].x = data.ghosts.cuatro.x; 
        	ghosts[3].y = data.ghosts.cuatro.y;
        	ghosts[3].state = data.ghosts.cuatro.st;
	        thisGame.ghostTimer = data.ghostTimer;//se podría hacer que se informase cuando sea necesario en lugar de continuamente.
	        //thisLevel.map = data.map;
	        thisGame.setMode(data.mode); //se podría hacer que se informase cuando es necesario desde donde sea necesario.
	    });
	//}


	//--------WS

	//our GameFramework returns a public API visible from outside its scope
    return {
        start: start,
		thisGame: thisGame
    };
};
var game = new GF();
game.start(); //BUCLE PRINCIPAL CORRIENDO DESDE CARGA JS.



socket.on("redirect",function(){
	window.location.href = "/missingRoom.html";
});

window.onload = function(){


	var arrayHref = window.location.href.split('?');
	var nombreSala = arrayHref[arrayHref.length-1];
	socket.emit("joinRoom",{room: nombreSala});


	/*css for mobile devices*/

	// Create the state-indicator element
	var indicator = document.createElement('div');
	indicator.className = 'state-indicator';
	document.body.appendChild(indicator);

	// Create a method which returns device state
	function getDeviceState() {
	    return parseInt(window.getComputedStyle(indicator).getPropertyValue('z-index'), 10);
	}

	if(getDeviceState() === 3){}// tablet, pero no tengo tablet para probar D:

	if( getDeviceState() === 4) { //mobile phone 

		$(".mainContainer").css( "width", "100%" );
    	$(".preContainer").css( "width", "95%" );
    	$(".canvasContainer").css( "width", "100%" );
    	
    	$(".canvasContainer").css( "border", "3px solid black" );

		$(".infoContainer").css( "width", "80%" );

    	$("#fps, #vidas, #puntuacion").css("font-size", "x-small");
		$("body").css("background-image", 'url("css/res/background-mobile.jpg")');
    	/*
    	#fps,#vidas,#puntuacion{
   		padding-top: 5px;
  		padding-bottom: 5px;
		*/
	}

}







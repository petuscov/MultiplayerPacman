var socket = io();

var inMainHub = true;

window.onload = function(){
	socket.emit("showRooms",{});
	$("#crear").click(function(){
		var nombreSala = $("#nombreSala").val();//se eliminan espacios en server.
		socket.emit("createRoom",{room: nombreSala});
	});
	$("#botNombre").click(function(){
		var botN = document.getElementById("botNombre");
		var control = document.getElementById("control");
		var nombre = control.innerHTML || control.value;
		localStorage.setItem("pacman_name",nombre);
		$("#name").text("Nombre: "+nombre);
		$("#botNombre").text("Cambiar nombre");
	});
}

function toArray(obj) {
      var rv = [];
      for (key in obj){
        rv.push(obj[key]);
    	//console.log("clave: " + key + ", valor: "+ obj[key]);
    }
      return rv;
    }

socket.on("rooms",function(data){
	
	//$("#salas > div").empty(); //optimizable, estamos borrando todas las salas y actualizandolas cuando se añade o se borran.
	$("#salas ").empty();
	var listaSalas = toArray(data.rooms); 
	for(var i=0; i<listaSalas.length;i++){
		room = listaSalas[i];
		$("#salas").append("<div id='"+room+"' class='room' >"+room+"</div>");
		$("#salas").append("<br>");
		$("#"+room).click(function(){
			window.location.href = "/pacman.html?"+room;//"http://localhost:8888/pacman.html?"+room;
		});
	}
});

socket.on("newRoom",function(data){
	window.location.href = "/pacman.html?"+data.room;//"http://localhost:8888/pacman.html?"+data.room;
	/* para el resto de sockets en mainhub
	$("#salas").append("<div id='"+data.room+"'>Click here to join the room: "+data.room+"</div>");
	$("#"+data.room).click(function(){
		socket.emit("joinRoom",{room: data.room});
	});*/
});
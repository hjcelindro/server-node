var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mqtt = require('mqtt');

var manufacturer;
var clients=[];

var mysql = require('mysql');
var connection = mysql.createConnection({
    host: 'br-cdbr-azure-south-a.cloudapp.net', //using microsoft azure mySQL
    user: 'bbbfe6f5303166',
    password: '6a070d81',
    database: 'RFIDtags'
});

//-----------------DATABASE CONNECTIONS-------

//connect to the database
connection.connect(function(err){
    if(err) { //if connection fails
        console.error("error connecting: "+err.stack); //display error code and message
        return;
    }
    console.log("Connected as: "+connection.threadId); //confirmation of connection with threadID
});

//----------------------------------



app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

http.listen(3000, function(){
    console.log('listening to port 3000');
});

var client = mqtt.connect('mqtt://54.200.3.119:1883');

io.sockets.on('connection',function(socket){
    
    var addedClient = false;
    
    socket.on('subscribe',function(data){
        console.log('Subscribing to :'+data.topic);
        client.subscribe(data.topic);
        var topic =data.topic;
        var split = topic.split('/');
        manufacturer = split[1];
    });
    
    socket.on('mqtt',function(data){
    });
    
    socket.on('register',function(name){

        socket.emit('update_clients',name);
        socket.join(name); //join room for the manufacturer
            
    });
     console.log('a user connected'+socket.id);
    socket.on('disconnect', function(){
            console.log('user disconnected');
    });
    
});
 
client.on('message',function(topic,message){
    console.log("Client.on"+String(message)+ " "+String(topic));
    var split = topic.split('/');
    manufacturer = split[1];
    io.to(manufacturer).emit('mqtt',{'topic':String(topic), 'payload':String(message)});
    searchDatabase();
});


//search Database

function searchDatabase(){
    console.log("Manufacturer: "+manufacturer);

    //-----this is a query function that gets rfid data from the online database and compares with reader values
    connection.query('select item_rfid, item_manufacturer from ' +rfid+' where item_manufacturer = '+manufacturer+"'",
    function(err,result,fields){
        if(err) throw err;
        else {
            console.log('Items with manufacturer '+manufacturer);
            console.log('----------------------------------------');
            for(var i in result){
                var found = result[i];
                console.log(found.item_rfid);
            }
        }
    });
        
        
    /*connection.query('SELECT * FROM rfid',function(err,rows){
        if(err)throw err;
        else{
            console.log('Data receieved from database'); //display message that data has been acquired from the database
            for(var i=0; i<rows.length;i++){
                var DBmanufacturer = rows[i].item_manufacturer;
                var tagid = rows[i].item_rfid; //to make coding easier
                
                if(DBmanufacturer===manufacturer){
                    console.log(DBmanufacturer);
                    console.log(tagid);
                }
            }
        }//END ELSE STATEMENT
    }); //END QUERY*/
} //END searchDatabase();

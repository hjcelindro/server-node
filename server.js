var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mqtt = require('mqtt');

var manufacturer;
var socketConnections = [];
var clients=[];
var items = [];
var data;

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

//var client = mqtt.connect('mqtt://54.200.3.119:1883');
var client = mqtt.connect('mqtt://rfidproject.hjcelindro.co.uk:1883');

io.sockets.on('connection',function(socket){
    
    console.log('a user connected'+socket.id);
    
    socketConnections++;
    io.sockets.emit('users connected',socketConnections);
    
    var addedClient = false;
    
    socket.on('subscribe',function(data){
        console.log('Subscribing to :'+data.topic);
        client.subscribe(data.topic);
        var topic =data.topic;
        var split = topic.split('/');
        manufacturer = split[1];
        searchDatabase();
        
    });
    
    socket.on('mqtt',function(data){
    });
    
    socket.on('register',function(name){

        socket.emit('update_clients',name);
        socket.join(name); //join room for the manufacturer
        
        var queryString = 'SELECT * FROM rfid.'+manufacturer+"'";
        connection.query(queryString, function(err, rows, fields) {
            if (err) {
                createTable();
                console.log('table created!');
            }
        });
        
});
            
    });
    socket.on('disconnect', function(){
        socketConnections--;
        io.sockets.emit('users connected',socketConnections);
        console.log('user disconnected');
    });
    
});
 
client.on('message',function(topic,message){
    console.log("Client.on"+String(message)+ " "+String(topic));
    var split = topic.split('/');
    manufacturer = split[1];
    //io.to(manufacturer).emit('mqtt',{'topic':String(topic), 'payload':String(message)});
    io.to(manufacturer).emit('mqtt',{'topic':String(topic), 'payload':data});
    connection.query('Insert into rfid.'+manufacturer+'(item_rfid, item_location) VALUES (?,?)', data);
    console.log(data.id);
});


//search Database

function searchDatabase(){
    console.log("Manufacturer: "+manufacturer);

    //-----this is a query function that gets rfid data from the online database and compares with reader values                
    connection.query('SELECT * FROM rfid',function(err,rows){
        if(err)throw err;
        else{
            console.log('Data receieved from database'); //display message that data has been acquired from the database
            for(var i=0; i<rows.length;i++){
                var DBmanufacturer = rows[i].item_manufacturer;
                var tagid = rows[i].item_rfid; //to make coding easier
                var loc = rows[i].item_location;
                if(DBmanufacturer===manufacturer){
                    console.log('items for manufacturer: '+DBmanufacturer);
                    data = {id:tagid,location:loc};
                    items.push(data);
                    //items.push({id:tagid,location:loc});
                }
            }
            //for (var i=0;i<items.length;i++){
              //  console.log(items);
            //}
        }//END ELSE STATEMENT
    }); //END QUERY
} //END searchDatabase();

function getManufacturerTable(){
    
    connection.query('Create table rfid.'+manufacturer+' (' + 
                     'item_rfid VARCHAR(10) NOT NULL, ' +
                     'item_location VARCHAR(10) NOT NULL, PRIMARY KEY(item_rfid)'+
                     ')');
    connection.query('Insert into rfid.'+manufacturer+'(item_rfid, item_location) VALUES (?,?)', data);
}

function createTable(){
    
    connection.query('Create table rfid.'+manufacturer+' (' + 
                     'item_rfid VARCHAR(10) NOT NULL, ' +
                     'item_location VARCHAR(10) NOT NULL, PRIMARY KEY(item_rfid)'+
                     ')');
}

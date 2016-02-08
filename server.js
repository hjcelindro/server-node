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
    searchDatabase();

    
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
    connection.query('SELECT * FROM rfid',function(err,rows){
        if(err)throw err;
        else{
            console.log('Data receieved from database'); //display message that data has been acquired from the database
            for(var i=0; i<rows.length;i++){
                var tagid = rows[i].item_rfid; //to make coding easier
                var DBmanufacturer = rows[i].item_manufacturer;
                
                console.log(DBmanufacturer);
            }
               /* for(var i=0;i<rows.length;i++){

                    var tagid = rows[i].item_rfid; //to make coding easier
                    manufacturer = rows[i].item_manufacturer;
                    var location = rows[i].item_location;

                    if(tagid===string_id){ //compares with the RFID scanned
                        console.log("Manufacturer of item "+tagid+" is "+manufacturer+" in Location: "+location); //output display on app side terminal
                        console.log("Notify "+manufacturer+" of new item");// output display on terminal
                        console.log("Item to notify: "+scanned_rfid+" to manufacturer: "+manufacturer);

                        message = "Manufacturer: "+manufacturer+"\nAn item with RFID "+tagid+
                            " has been sent to the centre"+"\n Location: "+location;

                        console.log("PUBLISHED:"+"Manufacturer: "+manufacturer+"\nAn item with RFID "+tagid+" has been sent to the centre");
                        io.on('connection', function(socket){
                            socket.on('chat message', function(topic,payload,packet){
                                io.emit('mqtt message', message);
                                console.log('mqtt message: ' + message);
                            });
                        });
                    }//END IF
                } *///END FOR LOOP
        }//END ELSE STATEMENT
    }); //END QUERY
} //END searchDatabase();

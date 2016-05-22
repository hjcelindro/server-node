var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mqtt = require('mqtt');

var manufacturer;
var item_manufacturer;
var loc;
var scanned_id;
var tagid;
var socketConnections = [];
var clients=[];
var items = [];
var all =[];
var data;
var topic;
var on_mqtt;
var mqtt_manu;
var message;

var DBmanufacturer;
var tagid;

var client_res;
var database_res;
var cli_start;

var mysql = require('mysql');
var connection = mysql.createConnection({
    host: 'iotproject.c0hpcx3lq7af.us-west-2.rds.amazonaws.com', //using AWS mySQL
    user: 'hjcelindro',
    password: 'Hannah0914',
    database: 'rfidtags'
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
app.get('/All', function(req, res){
    res.sendFile(__dirname + '/indexAll.html');
});
http.listen(3000, function(){
    console.log('listening to port 3000');
});

//var client = mqtt.connect('mqtt://54.200.3.119:1883');
var client = mqtt.connect('mqtt://rfidproject.hjcelindro.co.uk:1883');
var server = mqtt.connect('mqtt://rfidproject.hjcelindro.co.uk:1883');
var edison = mqtt.connect('mqtt://rfidproject.hjcelindro.co.uk:1883');


//--------------------------------------------------

io.sockets.on('connection',function(socket){ //The connection between the client response socket to server
    console.log('-----------------MQTT-------------');
    server.subscribe('response/manufacturer');
    console.log("subscribed to server");
    
    console.log('-----------------sockets-------------');
    socketConnections++;
    io.sockets.emit('users connected',socketConnections);
        
    socket.on('subscribe',function(data){
        console.log('a user connected'+socket.id);
        if(data.topic=='manufacturer/All'){
            client.subscribe('manufacturer/');
            console.log('------------------------------');
            console.log('Subscribing to: manufacturer/');
            manfacturer="All";
        }
        else{
            client.subscribe(data.topic);
            console.log('Subscribing to :'+data.topic);
            topic =data.topic;
            var split = topic.split('/');
            manufacturer = split[1];
        }
        searchManufacturerDatabase();
    });
    socket.on('mqtt',function(data){});
    socket.on('data_change',function(data){
        searchManufacturerDatabase();
    });
    socket.on('register',function(name){
        socket.emit('update_clients',name);
        clients.push(name);
        socket.join(name); //join room for the manufacturer
    });
    socket.on('disconnect', function(){
        socketConnections--;
        io.sockets.emit('users connected',socketConnections);
        console.log('user disconnected');
    });
    socket.on('time taken',function(data){
        var on_client = new Date().getTime();
        var mqtt_time = (on_client-on_mqtt)/1000;
    });
    
    socket.on('client response',function(data){
        client_res=data;
        var response = client_res;
        client.publish('response/manufacturer',response);
        io.emit('data_change',{'topic':String(topic), 'payload':data});
    });
});

//-------------------------------------------------------
client.on('message',function(topic,message){
    on_mqtt = new Date();
    console.log("Client.on "+String(message)+ " "+String(topic));
    var split = topic.split('/');
    scanned_id = String(message); //new id from Edison
    searchDatabase(scanned_id);
    if(topic=='manufacturer/'){
        mqtt_manu="All";
    }
    else{
        //mqtt_manu = split[1];
        mqtt_manu = item_manufacturer;
    }
    if(mqtt_manu==manufacturer||mqtt_manu=='All'){
        searchManufacturerDatabase();
    }
});//------------------END OF MQTT----------------------------------------


//---------------------MQTT when client responds to server---------------------
server.on('message',function(topic,message){
    cli_start = new Date().getTime();
    console.log("client responded with: "+ message);
    var themessage = String(message);
    var split = themessage.split('/');
    var id = split[0];
    var action = split[1];
    if(action==='Collect'){
        database_res="Collection";
    }
    else{
        database_res="Rejected";
    }
    ActionUpdateDatabase(id);
    io.emit('data_change',{'topic':String(topic), 'payload':data});
});//----------------END OF MQTT SERVER----------------------------------


//---------------------------------search Database for manufacturer--------------------------------
function searchManufacturerDatabase(){
    console.log("Join Table");
    var pre_query = new Date().getTime();
    
    //this is a query function that gets rfid data from the online database and compares with reader values                
    connection.query('SELECT rfid.item_rfid,rfid.item_manufacturer,rfid.item_location,rfid.Action, Sensor.location, Sensor.idSensor, readings.idSensor, readings.time, readings.dataReading FROM rfid INNER JOIN Sensor ON rfid.item_location=Sensor.location inner join readings on Sensor.location=readings.idSensor',function(err,rows){
        
        //Checks if there is a change in data and updates client side 
        if(err)throw err;
        else{
            io.emit('data_change',topic);
            var post_query = new Date().getTime();
            var duration = (post_query-pre_query)/1000;
            console.log('------------------------------');
            console.log("database connection taken: "+duration);
            console.log('Data receieved from database'); //display message that data has been acquired from the database
            console.log('------------------------------');
            
            //Fetches information from the database
            for(var i=0; i<rows.length;i++){
                DBmanufacturer = rows[i].item_manufacturer;
                tagid = rows[i].item_rfid; //to make coding easier
                loc = rows[i].item_location;
                var sensorData = rows[i].dataReading;
                var time = String(rows[i].time);
                var response_message=rows[i].Action;  

                //Emits all data from the database to the client side program.
                io.to('All').emit('mqtt',{'topic':'manufacturer/All', 'payload':{id:tagid,location:loc,manufacturer:DBmanufacturer,message:sensorData,response:response_message}});
                if(DBmanufacturer===manufacturer){
                    data = {id:tagid,location:loc,manufacturer:DBmanufacturer,message:sensorData,response:response_message,time:time};
                    io.to(manufacturer).emit('mqtt',{'topic':String(topic), 'payload':data});  
                }
            }
        }//END ELSE STATEMENT
    }); //END QUERY
} //------------------------------------END searchManufacturerDatabase()-------------------------------;

//--------------Search from RFID MQTT Messge from Edison-------------------------
function searchDatabase(id){
    var string_id = JSON.stringify(id).substr(1,10); //RFID data from arduino is an object, so to extract data, convert data to string
    console.log("SRFID: "+string_id);
    //-----this is a query function that gets rfid data from the online database and compares with reader values
    var pre_query = new Date().getTime();
    connection.query('SELECT * FROM tags',function(err,rows){
        if(err)throw err;
        else{
            var post_query = new Date().getTime();
            console.log('Data receieved from database'); //display message that data has been acquired from the database
            var duration = (post_query - pre_query)/1000;
            console.log("Connection Time: "+duration);
                for(var i=0;i<rows.length;i++){
 
                    var tagid = rows[i].cardID; //to make coding easier
                    item_manufacturer = rows[i].Manufacturer;

                    if((tagid===string_id)){ //compares with the RFID scanned
                        console.log("Manufacturer of item "+tagid+" is "+item_manufacturer+" in Location: location"); //output display on app side terminal
                    }//END IF
                } //END FOR LOOP
        }//END ELSE STATEMENT
    }); //END QUERY
} //END searchDatabase();


//-------------------search Database for action UPDATE-------------------
//When there are changes in the cloud database, the Client UI wouldupdate. 
function ActionUpdateDatabase(rfid){
    console.log("update rfid set Action="+"'"+database_res+"'"+" where item_rfid="+"'"+rfid+"'");
    var pre_query = new Date().getTime();
    
    //this is a query function that gets rfid data from the online database and COMPARES with reader values   
    connection.query("update rfid set Action="+"'"+database_res+"'"+" where item_rfid="+"'"+rfid+"'",function(err,rows){
        if(err)throw err;
        else{
            var post_query = new Date().getTime();
            var duration = (post_query-pre_query)/1000;
            console.log('------------------------------');
            console.log("database connection taken: "+duration);
            console.log('------------------------------');
            searchManufacturerDatabase();
            var ser_end = new Date().getTime();
            var cli_ser = (ser_end-cli_start)/1000;
            console.log("Time from client to server: "+cli_ser);
        }//END ELSE STATEMENT
    }); //END QUERY
} 
//-----------------END ActionUpdateDatabase();----------------------------------


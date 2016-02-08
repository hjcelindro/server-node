    <head>
        <h1>Real Time</h1>
        <title>Testing...</title>
        <style>
            table, th, td {
                border: 1px solid black;
                border-collapse: :collapse;
            }
            th, td {
                padding: 10px;
            }
        </style>
        <script src="/socket.io/socket.io.js"></script>
        <script src="http://code.jquery.com/jquery-1.11.1.js"></script>

        <script type="text/javascript">

            var socket = io.connect('http://54.200.3.119:3000');

            socket.on('connection',function(){

                socket.on('subscribe',function(msg){
                });
            });
            socket.on('mqtt',function(msg){
                addMessage(msg);
            });
            socket.on('mqtt',function(msg){
                $('table').append('<tr><td>'+JSON.stringify(msg.id)+'</td><br><td>'+String(msg.location)+'</td></tr>');
            });
            socket.on('update_clients',function(name){
                //updateClients(name);
                window.alert("Welcome "+name+'!');
            });
            
            function addMessage(message){
                var text = document.createTextNode(message.payload),
                    el = document.createElement('li'),
                    messages = document.getElementById('messages');

                el.appendChild(text);
                messages.appendChild(el);
            }
            
            function subscribeToTopic(){
                var textbox = document.getElementById("textbox");
                var output = document.getElementById("output");
                var name = textbox.value;
                var manufacturer = name.substr(0,1).toUpperCase() + name.substr(1);
                output.value = "You are Subscribed, "+manufacturer;
                
                var subscribe = 'manufacturer/'+manufacturer;
                socket.emit('subscribe',{topic: subscribe});
                socket.emit('register',manufacturer);
                
                $('div').show('clients');
                $('div').show('table');
                
            }
    
        </script>
    </head>
    <body>
        <form action=" ">
            <fieldset>
                <label>Type your Company name: </label>
                <input name="topic" id="textbox" type= "text" align="right" size="30"/></br>
                <input type="button" value="Subscribe" onclick = "subscribeToTopic()"/>
                <input type="text" id="output"  size = "50"/>
            </fieldset>
        </form>
        <div>
            <div id = 'clients' style="display:none"><h2>Welcome Client!</h2></div>
            <ul id = 'messages'><h3>Messages</h3></ul>
        </div>
        <div id='table'>
            <table id = "t1" style='width:60%' >
                <tr>
                    <th>Tag ID</th>
                    <th>Location</th>
                </tr>
            </table>
        </div>
    </body>
</html>

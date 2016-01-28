<h1>Real Time</h1>
<title>Testing...</title>
<script src="/socket.io/socket.io.js"></script>
<script src="http://code.jquery.com/jquery-1.11.1.js"></script>
<body>
    <script type="text/javascript">

    var socket = io.connect('http://54.200.3.119:3000');

    socket.on('connect',function(){

        socket.on('subscribe',function(msg){
            console.log("socket:"+msg);     
            addMessage(msg);
        });
        socket.on('mqtt',function(msg){
            console.log("testing"+msg.payload);
            addMessage(msg);
        });
        socket.emit('subscribe',{topic: 'manufacturer/Sony'});
    });

    function addMessage(message){
        var text = document.createTextNode(message),
            el = document.createElement('li'),
            messages = document.getElementById('messages');

        el.appendChild(text);
        messages.appendChild(el);
    }
</script>

    <ul id = 'messages'></ul>
</body>

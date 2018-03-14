<?php
	error_reporting(0);
	session_start();
	if (isset($_GET["length"])) {
		$filename = "C:\\www\\smarthome-socket\\daemon\\smarthomesocket.out.log"; //Edit this

		$old_data = "";
		$handle = fopen($filename, "r");
		$data = fread($handle, filesize($filename));

		$old_data = $_SESSION["log"];

		$send_data = str_replace($old_data, "", $data);
		echo htmlspecialchars($send_data);

		$_SESSION["log"] = $data;
		exit;
	} else {
		session_destroy();
	}
?>
<!DOCTYPE html>
<html>
<head>
	<title>Live fileread</title>
	<meta charset="UTF-8">
	<meta author="The bestest person in the world">
	<meta http-equiv="X-UA-Compatible" content="IE=edge" />
	<style type="text/css">
		html, body {
			margin: 0;
			padding: 0;
			width: 100%;
			height: 100%;
			background: black;
		}

		#content {
			width: 97%;
			height: 98.5%;
			position: absolute;
			top: 1.5%;
			left: 1.5%;
			color: rgb(0,255,0);
			font-size: 17px;
		}

		pre {
			margin: 0;
		}
	</style>
	<script type="text/javascript" src="https://code.jquery.com/jquery-2.2.4.min.js"></script>
	<script type="text/javascript">
		$(function(){
			var refreshtime = 5000;

			var interval = setInterval(function() {
				$("#init").css("display", "none");
				$.get("?length=0", function(data) {
					$("#put_into").append(data);
					$(document).scrollTop($(document).height());
				});
			}, refreshtime);
		});
	</script>
</head>
<body>
	<div id="content"><pre id="init">Initializing..</pre><pre id="put_into"></pre></div>
	<button id="restartovat" onclick='$.get("restartovat.php", function() {})' style='position: fixed; top: 10px; right: 10px'>Restartovat</button>
</body>
</html>

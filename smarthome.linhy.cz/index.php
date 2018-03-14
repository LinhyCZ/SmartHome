<!DOCTYPE html>
<html>
<head>
	<title>SmartHome</title>
	<meta charset="UTF-8">
	<link rel="stylesheet" type="text/css" href="/styles/main.css">
	<link rel="stylesheet" type="text/css" href="/styles/header.css">
	<link rel="stylesheet" type="text/css" href="/styles/body.css">

	<!-- Favicons -->
	<link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-touch-icon.png">
	<link rel="icon" type="image/png" sizes="32x32" href="/favicon/favicon-32x32.png">
	<link rel="icon" type="image/png" sizes="16x16" href="/favicon/favicon-16x16.png">
	<link rel="manifest" href="/favicon/manifest.json">
	<link rel="mask-icon" href="/favicon/safari-pinned-tab.svg" color="#5bbad5">
	<meta name="theme-color" content="#ffffff">
	<meta name="msapplication-config" content="/favicon/browserconfig.xml" />
	<!-- Favicons end -->

	<link href="https://fonts.googleapis.com/css?family=Roboto" rel="stylesheet"> <!-- Roboto font -->
	<link href="https://use.fontawesome.com/releases/v5.0.6/css/all.css" rel="stylesheet"> <!-- Font awesome -->

	<script type='text/javascript' src="https://code.jquery.com/jquery-3.2.1.min.js"></script> <!-- Jquery 3.2.1. -->

	<!--<script type='text/javascript' src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/1.7.4/socket.io.js"></script>-->
	<script type='text/javascript' src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/2.0.4/socket.io.js"></script>
	<script src="https://www.google.com/recaptcha/api.js" async defer></script>
	<script src="/js/jscolor.min.js"></script>
	<!-- <script type='text/javascript' src='https://code.jquery.com/ui/1.12.0/jquery-ui.min.js'></script>--> <!-- Jquery UI 1.12.0 -->
	<!--<script type='text/javascript' src='/js/blur.js'></script>--> <!-- Ported Blur.js -->
</head>
<body>
	<header id="main_header">
	  <div id="header_padding">
	    <i id="menu_icon" class="fas fa-bars" aria-hidden="true"></i>
	    <img id="logo" src="/images/final_banner_438x80.png">
	    <div id="right_square">
	      <div class="float_right">
	        <div class="login_placeholder disabled">
						<span class="logged_in_name">Přihlášený uživatel: </span>
						<span id="user_name" class="logged_in_name"></span>
					</div>
					<input type="button" class="login" id="login_button" value="Přihlásit se">
					<span class="login_spinner"><i class="login_button_icon fas fa-circle-notch fa-spin fa-fw"></i></span>
	      </div>
	    </div>
	  </div>
	  <div id="menu">
		</div>
	</header>

	<div class="login_form_placeholder">
		<form action="" method="post" id="login_form">
			<span class="login_form_header">Přihlášení</span>
			<i class="fas fa-times login_form_close" aria-hidden="true"></i>
			<input type="text" class="form_login_input" name="username" id="form_username_login_input" required placeholder="Uživatelské jméno">
			<input type="password" class="form_login_input" name="password" id="form_password_login_input" required placeholder="Heslo">
			<button type="submit" class="form_login_input" id="form_login_button"><span>Přihlásit</span></button>
			<span class="register_notice form_login_input">Ještě nemáte účet? <a href="" id="register_button">Zaregistrujte se zde.</a></span>
		</form>
	</div>

	<div class="register_form_placeholder">
		<form action="" method="post" id="register_form">
			<span class="register_form_header">Registrace</span>
			<i class="fas fa-times register_form_close" aria-hidden="true"></i>
			<input type="text" class="form_register_input" name="username" id="form_username_register_input" required placeholder="Uživatelské jméno">
			<input type="text" class="form_register_input" name="name" id="form_name_register_input" required placeholder="Jméno">
			<input type="text" class="form_register_input" name="surname" id="form_surname_register_input" required placeholder="Příjmení">
			<input type="password" class="form_register_input" name="password" id="form_password_register_input" required placeholder="Heslo">
			<input type="password" class="form_register_input" name="password_repeat" id="form_password_repeat_register_input" required placeholder="Zopakujte heslo">
			<input type="text" class="form_register_input" name="email" id="form_email_register_input" required placeholder="E-mail">
			<input type="text" class="form_register_input" name="phone" id="form_phone_register_input" placeholder="Telefonní čislo (nepovinné)">
			<div id='recaptcha' class="g-recaptcha" data-sitekey="6LcFDj0UAAAAAAr-u33N7IREXwCLWGQvlSOi7cM0" data-callback="executeRegistration" data-size="invisible"></div>
			<button type="submit" class="form_register_input" id="form_register_button"><span>Zaregistrovat</span></button>
		</form>
	</div>
	<div id="loader"><i class="login_button_icon fas fa-circle-notch fa-spin fa-fw"></i></div>

	<?php if (isset($_GET["validate"])) require('static/validate.html')?>

	<div class="body_placeholder">

	</div>

	<script>
		var login_timeout;
		var socket;

		$(function() {
			/*
			 * Animate menu
			 */
			var login_form_open = false;
			var register_form_open = false;

			socket = {
	       _isConnected: false,
	       _socket: null,
	       _interval: null,
				 _functions: {},
	       connect() {
					 self = this;
		       this._socket = io.connect('https://linhy.cz:8880');
		       this._socket.on('connect', () => {
			       this._isConnected = true;
		       });

		       this._socket.on('disconnect', () => {

			 			 console.log("DISCONNECTED!");
						 this.reconnect();
		       });

		       return true;
	       },

				 on(event, functionHandler) {
					 console.log("Attaching event: " + event);
					 this._functions[event] = functionHandler;
					 this._socket.off(event);
					 this._socket.on(event, functionHandler);
				 },

				 emit(event, data) {
					 console.log("Emitting event: " + event)
					 if (data != null) {
						 this._socket.emit(event, data);
					 } else {
						 this._socket.emit(event);
					 }
				 },

				 reconnect() {
					 this._interval = setInterval(function() {
						 console.log(socket._socket.connected);
						 if (!socket._socket.connected) {
							 socket._socket.connect();
						 } else {
							 clearInterval(socket._interval);
							 for (var event in socket._functions) {
								 socket._socket.on(event, socket._functions[event]);
							 }
							 socket._functions = {}
							 loadData();
						 }
					 }, 1000)
				 },

				 connected() {
					 return this._socket.connected;
				 }
       }

      socket.connect();

			socket.on("login_response", parse_login);
			socket.on("register_response", parse_register);
			socket.on("page_content", parse_pageContent);
			socket.on("test_resp", function(data) {
				console.log(data);
			})

			$("#menu_icon").click(function() {
				toggleMenu();
			});
			/*
			 * Animate menu end
			 */


			/*
			 * Animate login form
			 */
			$("#login_button").click(function() {
				if ($("#login_button").hasClass("login") == true) {
					var height = $(window).height()/2 - 150;
					height = height + "px";
					if (login_form_open == false && register_form_open == false) {
						$(".login_form_placeholder").animate({"top": height}, 300, function() {});
						$("#form_username_login_input").focus();
						login_form_open = true;
					} else if (register_form_open == true) {
						$(".login_form_placeholder").css("top", height);
						$(".login_form_placeholder").css("display", "none");
						$(".register_form_placeholder").fadeOut(150, function() {
							$(".login_form_placeholder").fadeIn(150);
							login_form_open = true;
							register_form_open = false;
						});
					} else {
						$(".login_form_placeholder").animate({"top": "-350px"}, 300, function() {});
						login_form_open = false;
					}
				} else {
					$("#menu").html("");
					$(".login_placeholder").addClass("disabled");
					$("#login_button").val("Přihlásit se");
					localStorage.removeItem("data");
					window.history.replaceState({}, document.title, "/");
					$("body_placeholder").html("");
					$("#login_button").addClass("login");
					$("#login_button").removeClass("logout");
					$("#login_button").css("margin-left", "0px");
					socket.emit("logout");
				}
			});

			$(".login_form_close").click(function() {
				login_form_open = false;
				$(".login_form_placeholder").animate({"top": "-350px"}, 300);
			});

			/*
			 * Animate login form end
			 */

			 /*
			  * Get login data
				*/

				$("#login_form").submit(function(e) {
					e.preventDefault();
					$("#form_login_button").blur();
					$("#form_login_button").html('<i class="login_button_icon fas fa-circle-notch fa-spin fa-fw"></i>');
						if (socket.connected()) {
							data = {};
							data["user"] = $("#form_username_login_input").val();
							data["pass"] = $("#form_password_login_input").val();
							socket.emit("login", JSON.stringify(data));
							console.log(JSON.stringify(data));
							login_timeout = setTimeout(failed_login, 10000);
					} else {
						alert("Cannot establish connection to server. Please try again later.");
					}
				});

				$("#register_form").submit(function(e) {
					e.preventDefault();
					grecaptcha.execute();
				});

				$("body").on("click", ".menu_item", function(e) {
					e.preventDefault();
					url = $(this).find("a").attr("href");
					data = {"url": url};
					window.history.replaceState({}, document.title, "/" + url);
					socket.emit("page_request", JSON.stringify(data));
					page_load(true);
					toggleMenu();
				})

				$("#register_button").click(function(e) {
					e.preventDefault();

					login_form_open = false;
					register_form_open = true;

					var height = $(window).height()/2 - 288;
					height = height + "px";

					$(".register_form_placeholder").css("top", height);
					$(".login_form_placeholder").fadeOut(150, function() {
						$(".login_form_placeholder").css("top", "-350px");
						$(".login_form_placeholder").css("display", "block");
						$(".register_form_placeholder").fadeIn(150);
					})
				});

				$(".register_form_close").click(function() {
					$(".register_form_placeholder").animate({"top": "-500px"}, 300, function(){
						$(".register_form_placeholder").css("display", "none");
					})
				});

				/*
				 * Get login data end
				 */

				 loadData();
		});

		$(window).on("load", function() {
			doVisuals();
		});

		/*
		 *  Load login data from local storage
		 */
		 function loadData() {
			 var data = localStorage.getItem("data");
			 if (window.location.search !== undefined && window.location.search !== "") {
				 url = window.location.search.split("&")[0];
				 console.log("URL DATA: " + url);
				 data = JSON.parse(data);
				 data["url"] = url;
				 data = JSON.stringify(data);
			 }
			 if (data != null) {
				 socket.emit("repeat_login", data);
			 } else {
				 $(".login_spinner").css("display", "none");
			 }
		 }

		 function doVisuals() {
			 $(".body_placeholder").css("left", ($(window).width() - $(".body_placeholder").width()) / 2);
 			 $(window).on("resize", function() {
 				 $(".body_placeholder").css("left", ($(window).width() - $(".body_placeholder").width()) / 2);
 			 })
			 setTimeout(page_load(false), 200);
		 };

		 function failed_login() {
			 console.log("Failed to login");
			 $("#form_login_button").html('<i class="login_button_icon login_button_padding fas fa-times" aria-hidden="true"></i><span>Chyba přihlášení, zkuste to, prosím, za chvíli.</span>');
			 $("#form_login_button").css("border", "1px solid #ea0707");
			 $("#form_login_button").css("color", "#ea0707");
			 setTimeout(function() {
				 $("#form_login_button").fadeOut(150, function() {
					 $(this).css("border", "1px solid white");
					 $(this).css("color", "white");
					 $(this).html('<i class="login_button_icon login_button_padding fas fa-times" aria-hidden="true"></i><i>Přihlásit</i>').fadeIn(150);
				 });
			 }, 2000);
		 }

		 function parse_login(data) {
			 if (login_timeout !== 'undefined') {
				 clearTimeout(login_timeout);
			 }
			 console.log(data);
			 if (data != "") {
				 var json = JSON.parse(data);
				 console.log(data);
				 $(".login_spinner").css("display", "none");
				 if(json["login"] == true) {
					 if (typeof(Storage) !== "undefined") {
						 localStorage.setItem("data", data);
						 console.log("Saved data into the local storage");
					 }
					 $("#user_name").html(json.Jmeno_Prijmeni); //Zapsat jméno do hlavičky
					 $(".login_placeholder").removeClass("disabled"); //Zobrazit hlavičku
					 $("#login_button").val("Odhlásit se"); // Nastavit hodnotu tlačítka
					 $("#login_button").removeClass("login"); //Odebrat třídu pro indentifitkace
					 $("#login_button").addClass("logout"); //Přidat třídu pro indentifitkace
					 $("#login_button").css("margin-left", "10px"); //Přidat margin k tlačitku
					 // Animace tlačítka úspěšně přihlášeno (Zelená barva, text) a posun formuláře nahoru mimo obraz
					 $("#form_login_button").fadeOut(150, function() {
						 $("#form_login_button").css("border", "1px solid #2bd822");
						 $("#form_login_button").css("color", "#2bd822");
						 $("#form_login_button").html('<i class="login_button_icon login_button_padding fas fa-check" aria-hidden="true"></i><span>Úspěšně přihlášeno</span>').fadeIn(150); //Nastavení
						 setTimeout(function() {
							 $(".login_form_placeholder").animate({"top": "-350px"}, 300, function() {
								 $("#form_username_login_input").val("");
								 $("#form_password_login_input").val("");
								 $("#form_login_button").html('<span>Přihlásit</span>');
								 $("#form_login_button").css("border", "1px solid white");
								 $("#form_login_button").css("color", "white");
							 });
							 login_form_open = false;
						 }, 1000);
					 });
					 // Konec animace tlačítka
				 } else {
					 window.history.replaceState({}, document.title, "/");
 					$("body_placeholder").html("");
					 //Animace tlačítka nesprávné přihlášení (Červená barva, text) a následné znovu objevení tlačítka
					 $("#form_login_button").fadeOut(150, function() {
						 $("#form_login_button").css("border", "1px solid #ea0707");
						 $("#form_login_button").css("color", "#ea0707");
						 $("#form_login_button").html('<i class="login_button_icon login_button_padding fas fa-times" aria-hidden="true"></i><span>Špatné uživatelské jméno nebo heslo</span>').fadeIn(150);
						 setTimeout(function() {
							 $("#form_login_button").fadeOut(150, function() {
								 $(this).css("border", "1px solid white");
								 $(this).css("color", "white");
								 $(this).html('<span>Přihlásit</span>').fadeIn(150);
							 });
						 }, 2000);
					 });
				 }
			 }
		 }

		 function parse_register(data) {
			 console.log(data);
			 json = JSON.parse(data);
			 if (json.successful == true) {
				 $("#form_register_button").html('<i class="login_button_icon login_button_padding fas fa-check" aria-hidden="true"></i><span>Úspěšně zaregistrováno!<br>Potvrďte registraci v emailu.</span>');
				 $("#form_register_button").css("border", "1px solid #2bd822");
				 $("#form_register_button").css("color", "#2bd822");
			 } else {
				 $("#form_register_button").html('<i class="login_button_icon login_button_padding fas fa-times" aria-hidden="true"></i><span>Nepodařilo se zaregistrovat uživatele.</span>');
				 $("#form_register_button").css("border", "1px solid #ea0707");
				 $("#form_register_button").css("color", "#ea0707");
			 }
		 }
		 /*
		 *  Load login data from local storage end
		 */

		 function executeRegistration(token) {
			 $("#form_register_button").html('<i class="login_button_icon fas fa-circle-notch fa-spin fa-fw"></i>');
			 if ($("#form_password_register_input").val() == $("#form_password_repeat_register_input").val()) {
				 $("#form_password_register_input").css("border", "1px solid white");
				 $("#form_password_repeat_register_input").css("border", "1px solid white");
				 data = {}
				 data["username"] = $("#form_username_register_input").val();
				 data["name"] = $("#form_name_register_input").val();
				 data["surname"] = $("#form_surname_register_input").val();
				 data["password"] = $("#form_password_register_input").val();
				 data["email"] = $("#form_email_register_input").val();
				 data["phone"] = $("#form_phone_register_input").val();
				 data["token"] = token;
				 socket.emit("register", JSON.stringify(data));
			 } else {
				 $("#form_password_register_input").css("border", "1px solid red");
				 $("#form_password_repeat_register_input").css("border", "1px solid red");
			 }
		 }

		 function parse_pageContent(data) {
			 console.log("received data: " + data);
			 json = JSON.parse(data);
			 $("#menu").html("");
			 $.each(json["Menu"], function(key, value) {
			 	$("#menu").append("<div class='menu_item'><a href='" + value[1] + "'>" + value[0] + "</a></div>")
			 })
			 $(".body_placeholder").html("");
			 $(".body_placeholder").append(json["Body"]);
			 page_load(false);
			 if (json["URL"] != undefined) {
				 $.getScript("/js/pages/" + json["URL"] + ".js", function() {
					 if (typeof(runAtPageLoad) == "function") {
						 runAtPageLoad();
					 }
				 })
			 }
		 }

		 function page_load(opt) {
			 if (opt) {
				 $("#loader").fadeIn(300);
			 } else {
				 $("#loader").fadeOut(300);
			 }
		 }

		 function toggleMenu() {
			 left = $("#menu").css("left").substring(0, $("#menu").css("left").length - 2);
			 if (left < 0) {
 				 $("#menu").animate({"left": "0"}, 300);
 			 } else {
 				 $("#menu").animate({"left": "-300px"}, 300);
 			 }
		 }

		 function getToken() {
			 var data = localStorage.getItem("data");
			 var jsonStorageData = JSON.parse(data);

			 return jsonStorageData["identifier"];
		 }
	</script>
</body>
</html>

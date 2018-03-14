<?php
  require 'fn_hashPassword.php';
  if (!isset($_POST["password"]) && !isset($_POST["username"])) {
    $array = array('login' => "not_successful", 'reason' => "username_password_not_specified");
  } else if (!isset($_POST["username"])) {
    $array = array('login' => "not_successful", 'reason' => "username_not_specified");
  } else if (!isset($_POST["password"])) {
      $array = array('login' => "not_successful", 'reason' => "password_not_specified");
  } else {
    $serverName = "localhost";
    $connectionInfo = array( "Database"=>"SmartHome", "UID"=>"SmartHome", "PWD"=>"jHkl8&zTH?", "CharacterSet" => "UTF-8");
    $conn = sqlsrv_connect( $serverName, $connectionInfo);

    if( $conn ) {
      $results = false;
      $params = array();
      $options =  array("Scrollable" => SQLSRV_CURSOR_KEYSET);

      $sql = "SELECT Jmeno, Prijmeni, Heslo FROM tab_uzivatel WHERE Prihlasovaci_jmeno = '" . $_POST["username"] . "' OR email = '" . $_POST["username"] . "'";

      $stmt = sqlsrv_query($conn, $sql, $params, $options);

      file_put_contents("log.txt", "Počet řádků: " . sqlsrv_num_rows($stmt) . PHP_EOL, FILE_APPEND);
      if(sqlsrv_num_rows($stmt) == 1) {
        $row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC);
        if (validatePassword($_POST["password"], $row["Heslo"]) === true) {
          $results = true;

          $fullname = $row["Jmeno"] . " " . $row["Prijmeni"];
          $array = array('login' => "successful", 'fullname' => $fullname);;

        } else {
          $array = array('login' => "not_successful", 'reason' => "username_password");
        }
      } else {
        $array = array('login' => "not_successful", 'reason' => "username_password");
      }

      if ($results != true) {
        $array = array('login' => "not_successful", 'reason' => "username_password");
      }
    } else {
      $array = array('login' => "not_successful", 'reason' => "sql_error");
    }
  }


  echo json_encode($array);
?>

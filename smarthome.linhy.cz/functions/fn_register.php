<?php
  file_put_contents("log.txt", "Uživtelské jméno: " . $_POST["username"] . PHP_EOL, FILE_APPEND);
  file_put_contents("log.txt", "Jméno: " . $_POST["name"] . PHP_EOL, FILE_APPEND);
  file_put_contents("log.txt", "Příjmení: " . $_POST["surname"] . PHP_EOL, FILE_APPEND);
  file_put_contents("log.txt", "Heslo: " . $_POST["password"] . PHP_EOL, FILE_APPEND);
  file_put_contents("log.txt", "Email: " . $_POST["email"] . PHP_EOL, FILE_APPEND);
  file_put_contents("log.txt", "Telefonní číslo: " . $_POST["phone"] . PHP_EOL, FILE_APPEND);

  echo "done";
?>

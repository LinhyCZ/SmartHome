<?php
  require 'configuration.php';

  function hashPassword($password) {
    global $pepper;
    return password_hash($password . $pepper, PASSWORD_BCRYPT);
  }

  function validatePassword($password, $hash) {
    global $pepper;
    return password_verify($password . $pepper, $hash);
  }
?>

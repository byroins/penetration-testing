<?php
header('Content-Type: text/html; charset=utf-8');
$file = $_GET['file'];
include($file);
?>
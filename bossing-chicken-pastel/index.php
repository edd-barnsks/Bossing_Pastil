<?php
// Apache/XAMPP root convenience redirect. Vite uses index.html during development.
header('Location: ./dist/', true, 302);
exit;

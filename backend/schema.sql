-- ==========================================================
--  BASE DE DATOS COMPLETA: Club Deportivo Looney Ducks (13 tablas)
--
--  Sirve para la base local (phpMyAdmin / XAMPP) y para Aiven (DBeaver).
--  Solo crea lo que falta: NO borra ni cambia tus datos. Se puede ejecutar varias veces.
--
--  phpMyAdmin: pestaña SQL -> pegar -> Continuar
--  DBeaver:    editor SQL -> pegar -> Alt + X (ejecutar script completo)
-- ==========================================================

CREATE DATABASE IF NOT EXISTS looney_ducks_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE looney_ducks_db;

-- ==========================================================
--  USUARIOS (administradores / directiva del sistema)
-- ==========================================================
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(50) NOT NULL,
    apellido_paterno VARCHAR(50),
    apellido_materno VARCHAR(50),
    ci VARCHAR(20),
    celular VARCHAR(20),
    clave VARCHAR(500) NOT NULL,
    rol VARCHAR(50) DEFAULT 'Directiva',
    estado INT NOT NULL DEFAULT 0,
    fechaActualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ==========================================================
--  CUENTAS (atletas, padres y entrenadores que inician sesión)
--  Límites que aplica el backend: 2 cuentas por celular, 100 atletas,
--  100 padres y entrenadores asignados por el administrador.
-- ==========================================================
CREATE TABLE IF NOT EXISTS cuentas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rol VARCHAR(20) NOT NULL,                  -- entrenador | atleta | padre
    nombre VARCHAR(100) NOT NULL,              -- nombre completo (o nombre(s) si es atleta)
    apellido_paterno VARCHAR(50) DEFAULT NULL, -- solo atletas
    apellido_materno VARCHAR(50) DEFAULT NULL, -- solo atletas
    usuario VARCHAR(30) NOT NULL UNIQUE,
    clave VARCHAR(500) NOT NULL,               -- contraseña hasheada
    celular VARCHAR(8) NOT NULL,
    correo VARCHAR(120) NOT NULL,
    estado INT NOT NULL DEFAULT 0,             -- 0 = activa, 1 = eliminada (lógica)
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fechaActualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_cuentas_rol (rol),
    INDEX idx_cuentas_correo (correo),
    INDEX idx_cuentas_celular (celular)
);

-- ==========================================================
--  JUGADORES (atletas del club) Y SUS TUTORES
-- ==========================================================
CREATE TABLE IF NOT EXISTS jugadores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    posicion VARCHAR(50),
    fecha_nacimiento DATE NOT NULL,
    rama VARCHAR(20) NOT NULL,
    usuarios_id INT,
    estado INT NOT NULL DEFAULT 0,
    fechaActualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuarios_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS tutores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    jugador_id INT NOT NULL,
    nombre_tutor VARCHAR(100) DEFAULT NULL,
    celular_tutor VARCHAR(20) DEFAULT NULL,
    FOREIGN KEY (jugador_id) REFERENCES jugadores(id) ON DELETE CASCADE
);

-- ==========================================================
--  PAGOS (mensualidades). Sin método de pago: ya no se usa efectivo/QR.
-- ==========================================================
CREATE TABLE IF NOT EXISTS pagos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    jugador_id INT NOT NULL,
    anio INT NOT NULL,
    mes VARCHAR(20) NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    fecha_pago DATETIME DEFAULT CURRENT_TIMESTAMP,
    usuarios_id INT,
    estado INT NOT NULL DEFAULT 0,
    fechaActualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (jugador_id) REFERENCES jugadores(id) ON DELETE CASCADE,
    FOREIGN KEY (usuarios_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    UNIQUE KEY unico_pago (jugador_id, anio, mes)
);

-- ==========================================================
--  ACTIVIDADES, FOTOS, LIKES Y COMENTARIOS
-- ==========================================================
CREATE TABLE IF NOT EXISTS actividades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    anio VARCHAR(10) NULL,
    titulo VARCHAR(150) NOT NULL,
    descripcion TEXT NOT NULL,
    imagen_url TEXT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    imagen VARCHAR(255) DEFAULT NULL,
    gestion VARCHAR(10) NOT NULL
);

-- Carrusel de hasta 12 fotos por actividad
CREATE TABLE IF NOT EXISTS actividad_imagenes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    actividad_id INT NOT NULL,
    imagen VARCHAR(255) NOT NULL,
    orden INT NOT NULL DEFAULT 0,
    FOREIGN KEY (actividad_id) REFERENCES actividades(id) ON DELETE CASCADE
);

-- Me gusta (la consulta de actividadController los cuenta desde "likes")
CREATE TABLE IF NOT EXISTS likes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    actividad_id INT NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (actividad_id) REFERENCES actividades(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS actividad_likes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    actividad_id INT NOT NULL,
    user_ip VARCHAR(45) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (actividad_id) REFERENCES actividades(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS comentarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    actividad_id INT NOT NULL,
    texto TEXT NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (actividad_id) REFERENCES actividades(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS actividad_comentarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    actividad_id INT NOT NULL,
    autor VARCHAR(100) NOT NULL,
    comentario TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (actividad_id) REFERENCES actividades(id) ON DELETE CASCADE
);

-- ==========================================================
--  PÁGINA DE INICIO: métricas y próximo encuentro
-- ==========================================================
CREATE TABLE IF NOT EXISTS estadisticas_club (
    id INT PRIMARY KEY,
    atletas VARCHAR(20) NOT NULL,
    titulos VARCHAR(20) NOT NULL,
    disciplinas VARCHAR(20) NOT NULL,
    anios VARCHAR(20) NOT NULL
);

INSERT INTO estadisticas_club VALUES (1, '+250', '15+', '2', '8')
ON DUPLICATE KEY UPDATE id = id;

CREATE TABLE IF NOT EXISTS proximo_encuentro (
    id INT PRIMARY KEY,
    equipo_local VARCHAR(60) NOT NULL,
    equipo_rival VARCHAR(60) NOT NULL,
    lugar VARCHAR(120) NOT NULL,
    fecha_hora VARCHAR(80) NOT NULL,
    estado VARCHAR(30) NOT NULL
);

INSERT INTO proximo_encuentro VALUES
(1, 'Looney Ducks', 'Rival Local', 'Coliseo Municipal de Sacaba', 'Sábado 16:00 HB', 'Próximamente')
ON DUPLICATE KEY UPDATE id = id;

-- ==========================================================
--  AJUSTES PARA BASES YA CREADAS (si todo ya existe, no hacen nada)
-- ==========================================================

-- "actividades": columnas anio e imagen_url, por si tu base es antigua o se creó sin ellas
SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'actividades' AND COLUMN_NAME = 'anio');
SET @s := IF(@c = 0, 'ALTER TABLE actividades ADD COLUMN anio VARCHAR(10) NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'actividades' AND COLUMN_NAME = 'imagen_url');
SET @s := IF(@c = 0, 'ALTER TABLE actividades ADD COLUMN imagen_url TEXT NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- "pagos": si tu base local aún tiene la columna metodo_pago, se conserva pero opcional
SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pagos' AND COLUMN_NAME = 'metodo_pago');
SET @s := IF(@c > 0, 'ALTER TABLE pagos MODIFY metodo_pago VARCHAR(20) NULL DEFAULT NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- ==========================================================
--  Comprobación: deben salir 13 tablas
-- ==========================================================
SHOW TABLES;
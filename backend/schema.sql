-- ==========================================
--  BASE DE DATOS: Club Deportivo Looney Ducks (MVC)
-- ==========================================

CREATE DATABASE IF NOT EXISTS looney_ducks_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE looney_ducks_db;

-- ==========================================
--  USUARIOS (directiva / administradores)
-- ==========================================
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

-- ==========================================
--  JUGADORES (atletas)
-- ==========================================
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

-- ==========================================
--  PAGOS (mensualidades)
-- ==========================================
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

-- ==========================================
--  ACTIVIDADES, LIKES Y COMENTARIOS
-- ==========================================
CREATE TABLE IF NOT EXISTS actividades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    descripcion TEXT NOT NULL,
    gestion VARCHAR(10) NOT NULL,
    imagen VARCHAR(255) DEFAULT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS actividad_comentarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    actividad_id INT NOT NULL,
    autor VARCHAR(100) NOT NULL,
    comentario TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (actividad_id) REFERENCES actividades(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS actividad_likes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    actividad_id INT NOT NULL,
    user_ip VARCHAR(45) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (actividad_id) REFERENCES actividades(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS actividad_imagenes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    actividad_id INT NOT NULL,
    imagen VARCHAR(255) NOT NULL,
    orden INT NOT NULL DEFAULT 0,
    FOREIGN KEY (actividad_id) REFERENCES actividades(id) ON DELETE CASCADE
);
/* ==========================================
   GALERÍA
   ========================================== */
.galeria-grid { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }

.galeria-item { cursor: pointer; transition: transform 0.2s ease, border-color 0.2s ease; }
.galeria-item:hover { transform: translateY(-4px); border-color: var(--orange-main); }
.galeria-item p { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.galeria-vacio {
    grid-column: 1 / -1;
    text-align: center;
    color: var(--text-muted);
    padding: 40px 20px;
}

.galeria-filtros {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
    margin-bottom: 25px;
}
.galeria-filtro {
    padding: 8px 18px;
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 107, 0, 0.4);
    color: var(--text-light);
    font-size: 0.85rem;
    letter-spacing: 0;
    text-transform: none;
}
.galeria-filtro:hover { transform: none; background: rgba(255, 107, 0, 0.2); }
.galeria-filtro.activo { background: var(--orange-main); border-color: var(--orange-main); }

/* Visor de foto ampliada */
.galeria-visor {
    position: fixed;
    inset: 0;
    z-index: 2000;
    background: rgba(0, 0, 0, 0.92);
    align-items: center;
    justify-content: center;
}
.galeria-visor img {
    max-width: 92vw;
    max-height: 80vh;
    object-fit: contain;
    border-radius: 8px;
}
.visor-cerrar,
.visor-flecha {
    position: absolute;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.15);
    color: #fff;
    line-height: 1;
    letter-spacing: 0;
    text-transform: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
}
.visor-cerrar:hover,
.visor-flecha:hover { transform: none; background: rgba(255, 107, 0, 0.8); }
.visor-cerrar { top: 20px; right: 20px; width: 40px; height: 40px; font-size: 18px; }
.visor-flecha { top: calc(50% - 22px); width: 44px; height: 44px; font-size: 26px; }
.visor-flecha.izq { left: 20px; }
.visor-flecha.der { right: 20px; }
.visor-pie {
    position: absolute;
    bottom: 24px;
    left: 0;
    right: 0;
    text-align: center;
    color: #e2e8f0;
    font-size: 0.85rem;
    padding: 0 60px;
}
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
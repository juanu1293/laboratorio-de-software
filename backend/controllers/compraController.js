const db = require("../db");

exports.resumenCompra = async (req, res) => {
  try {
    const { idtiquete } = req.body;

    const query = `
      SELECT 
        t.idtiquete,
        t.idvuelo,
        t.clase,
        t.tipo,
        t.conexion,
        v.origen,
        v.destino,
        v.costo_economico,
        v.costo_vip,
        CASE 
          WHEN t.clase = 'vip' THEN v.costo_vip
          WHEN t.clase = 'economica' THEN v.costo_economico
          ELSE 0
        END as precio
      FROM usuario.tiquete t
      INNER JOIN usuario.vuelo v ON v.id_vuelo = t.idvuelo
      WHERE t.idtiquete = $1
    `;

    const result = await db.query(query, [idtiquete]);

    if (result.rows.length === 0) {
      return res.status(404).json({ mensaje: "Tiquete no encontrado" });
    }

    const tiquete = result.rows[0];

    let idTiquetePareja = null;
    let multiplicador = 1;

    if (tiquete.tipo === "ida y vuelta") {
      const queryPareja = `
        SELECT t2.idtiquete
        FROM usuario.tiquete t2
        INNER JOIN usuario.carrito c2 ON c2.idtiquete = t2.idtiquete
        WHERE t2.conexion = $1 
          AND t2.tipo = 'ida y vuelta'
          AND t2.idtiquete != $2
        ORDER BY c2.horacreacion ASC
        LIMIT 1
      `;

      const pareja = await db.query(queryPareja, [tiquete.conexion, idtiquete]);

      if (pareja.rows.length > 0) {
        idTiquetePareja = pareja.rows[0].idtiquete;
        multiplicador = 1;
      }
    }

    let precioBase =
      tiquete.clase === "economica"
        ? tiquete.costo_economico
        : tiquete.costo_vip;

    const precioFinal = precioBase * multiplicador;

    return res.json({
      idtiquete,
      idTiquetePareja,
      origen: tiquete.origen,
      destino: tiquete.destino,
      clase: tiquete.clase,
      tipo: tiquete.tipo,
      precio: precioFinal
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error en resumen de compra" });
  }
};

exports.pagarCompra = async (req, res) => {
  const client = await db.connect();

  try {
    const { idcliente, idtiquete, numtarjeta, metodopago } = req.body;

    if (!idcliente || !idtiquete || !numtarjeta || !metodopago) {
      return res.status(400).json({ mensaje: "Datos incompletos" });
    }

    const tiqueteResult = await client.query(
      `SELECT t.idtiquete, t.idvuelo, t.clase, t.tipo, t.conexion
       FROM usuario.tiquete t
       WHERE t.idtiquete = $1`,
      [idtiquete]
    );

    if (tiqueteResult.rows.length === 0) {
      return res.status(404).json({ mensaje: "Tiquete no encontrado" });
    }

    const tiquete = tiqueteResult.rows[0];

    let idTiquetePareja = null;
    let multiplicador = 1;

    if (tiquete.tipo === "ida y vuelta") {
      const parejaResult = await client.query(
        `SELECT t2.idtiquete 
         FROM usuario.tiquete t2
         INNER JOIN usuario.carrito c2 ON c2.idtiquete = t2.idtiquete
         WHERE t2.conexion = $1
           AND t2.tipo = 'ida y vuelta'
           AND t2.idtiquete != $2
         ORDER BY c2.horacreacion ASC
         LIMIT 1`,
        [tiquete.conexion, idtiquete]
      );

      if (parejaResult.rows.length > 0) {
        idTiquetePareja = parejaResult.rows[0].idtiquete;
        multiplicador = 1;
      }
    }

    const precioVuelo = await client.query(
      `SELECT costo_economico, costo_vip 
       FROM usuario.vuelo
       WHERE id_vuelo = $1`,
      [tiquete.idvuelo]
    );

    const precioBase =
      tiquete.clase === "economica"
        ? precioVuelo.rows[0].costo_economico
        : precioVuelo.rows[0].costo_vip;

    const precioFinal = precioBase * multiplicador;

    const tarjetaResult = await client.query(
      `SELECT saldo
       FROM usuario.tarjeta 
       WHERE numtarjeta = $1`,
      [numtarjeta]
    );

    if (tarjetaResult.rows.length === 0) {
      return res.status(404).json({ mensaje: "Tarjeta no encontrada" });
    }

    const { saldo } = tarjetaResult.rows[0];

    if (saldo < precioFinal) {
      return res.status(400).json({ mensaje: "Fondos insuficientes" });
    }

    await client.query("BEGIN");

    await client.query(
      `UPDATE usuario.tarjeta 
       SET saldo = saldo - $1 
       WHERE numtarjeta = $2`,
      [precioFinal, numtarjeta]
    );

    const pagoPrincipal = await client.query(
  `INSERT INTO usuario.pago 
   (idcliente, idtiquete, monto, fechapago, metodopago, estado)
   VALUES ($1, $2, $3, NOW(), $4, 'pagado')
   RETURNING idpago`,
  [idcliente, idtiquete, precioBase, 'tarjeta']
);

    await client.query(
      `UPDATE usuario.tiquete 
       SET estado = 'comprado' 
       WHERE idtiquete = $1`,
      [idtiquete]
    );

    await client.query(
      `DELETE FROM usuario.carrito 
       WHERE idtiquete = $1`,
      [idtiquete]
    );

    let pagoParejaId = null;

    if (idTiquetePareja) {
      const pagoPareja = await client.query(
  `INSERT INTO usuario.pago 
   (idcliente, idtiquete, monto, fechapago, metodopago, estado)
   VALUES ($1, $2, $3, NOW(), $4, 'pagado')
   RETURNING idpago`,
  [idcliente, idTiquetePareja, precioBase, 'tarjeta']
);

      pagoParejaId = pagoPareja.rows[0].idpago;

      await client.query(
        `UPDATE usuario.tiquete 
         SET estado = 'comprado' 
         WHERE idtiquete = $1`,
        [idTiquetePareja]
      );

      await client.query(
        `DELETE FROM usuario.carrito 
         WHERE idtiquete = $1`,
        [idTiquetePareja]
      );
    }

    await client.query("COMMIT");

    return res.json({
      mensaje: "Pago realizado correctamente",
      total_pagado: precioFinal,
      id_pago_principal: pagoPrincipal.rows[0].idpago,
      id_pago_pareja: pagoParejaId,
      tiquete_principal: idtiquete,
      tiquete_pareja: idTiquetePareja
    });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error en pago:", error.message);
    res.status(500).json({ mensaje: "Error al procesar el pago" });
  } finally {
    client.release();
  }
};


exports.obtenerHistorialCompras = async (req, res) => {
  try {
    const { idcliente } = req.params;
    
    console.log("📋 Obteniendo historial de compras para cliente:", idcliente);

    // Consulta simple para obtener las compras realizadas
    const query = `
      SELECT 
        p.idpago,
        p.idtiquete,
        p.monto,
        p.fechapago,
        p.metodopago,
        p.estado,
        t.clase,
        v.origen,
        v.destino,
        v.fecha_salida,
        v.fecha_llegada
      FROM usuario.pago p
      INNER JOIN usuario.tiquete t ON t.idtiquete = p.idtiquete
      INNER JOIN usuario.vuelo v ON v.id_vuelo = t.idvuelo
      WHERE p.idcliente = $1
        AND p.estado = 'pagado'
      ORDER BY p.fechapago DESC
      LIMIT 20
    `;

    const result = await db.query(query, [idcliente]);

    console.log(`✅ ${result.rows.length} compras encontradas`);

    // Formatear respuesta simple
    const compras = result.rows.map(compra => ({
      id_compra: compra.idpago,
      id_tiquete: compra.idtiquete,
      fecha_compra: compra.fechapago,
      monto: Number(compra.monto),
      metodo_pago: compra.metodopago || 'tarjeta',
      estado: compra.estado,
      clase: compra.clase,
      origen: compra.origen,
      destino: compra.destino,
      fecha_vuelo: compra.fechasalida
    }));

    res.json(compras);

  } catch (error) {
    console.error("❌ Error obteniendo historial de compras:", error);
    res.status(500).json({ 
      mensaje: "Error al obtener el historial de compras",
      error: error.message 
    });
  }
};

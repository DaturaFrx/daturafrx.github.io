<?php
session_start();
include '../configuracion.php';
include_once('../header.php');

const EXCHANGE_RATE = 19;

if (!isset($_SESSION['usuario']) || !isset($_SESSION['usuario']['id'])) {
    echo "<p style='color: red; margin-bottom: 1rem;'>Por favor, inicie sesión para proceder con la compra.</p>";
    echo "<a href='index.php' style='background: blue; color: white; padding: 0.75rem 1.5rem; text-decoration: none; border-radius: 5px;'>Ir a la página de inicio</a>";
    exit();
}

$id_usuario = $_SESSION['usuario']['id'];

$descuentos_por_programa = [
    1 => 2,
    2 => 4,
    3 => 6,
    4 => 8,
    5 => 100,
    6 => 12,
    7 => 14,
    8 => 16,
    9 => 18,
    10 => 20,
    11 => 22,
    12 => 24,
    13 => 26,
    14 => 28,
    15 => 30,
    16 => 32,
    17 => 34,
    18 => 36,
    19 => 38,
    20 => 40,
    21 => 42,
    22 => 44,
    23 => 46,
    24 => 48,
    25 => 50
];

try {
    $conexion = Conexion::getInstance()->getConnection();

    $query_puntos = "SELECT puntos FROM Puntos_Acumulados WHERE id_usuario = :id_usuario";
    $stmt_puntos = $conexion->prepare($query_puntos);
    $stmt_puntos->bindParam(':id_usuario', $id_usuario, PDO::PARAM_INT);
    $stmt_puntos->execute();
    $puntos_usuario = $stmt_puntos->fetchColumn() ?: 0;

    $query_descuento = "
        SELECT id_programa, puntos_requeridos
        FROM programa_lealtad
        WHERE puntos_requeridos <= :puntos
        ORDER BY puntos_requeridos DESC
        LIMIT 1
    ";
    $stmt_descuento = $conexion->prepare($query_descuento);
    $stmt_descuento->bindParam(':puntos', $puntos_usuario, PDO::PARAM_INT);
    $stmt_descuento->execute();
    $nivel_descuento = $stmt_descuento->fetch(PDO::FETCH_ASSOC);

    $descuento = 0;
    $id_programa_descuento = null;
    $porcentaje_descuento = 0;

    if ($nivel_descuento) {
        $id_programa_descuento = $nivel_descuento['id_programa'];
        $porcentaje_descuento = $descuentos_por_programa[$id_programa_descuento] ?? 0;
    }
} catch (Exception $e) {
    echo "<p style='color: red; margin-bottom: 1rem;'>Error al calcular descuento: " . $e->getMessage() . "</p>";
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $conexion = Conexion::getInstance()->getConnection();
        $conexion->beginTransaction();

        $query = "DELETE FROM carrito WHERE id_usuario = :id_usuario";
        $stmt = $conexion->prepare($query);
        $stmt->bindParam(':id_usuario', $id_usuario, PDO::PARAM_INT);
        $stmt->execute();

        $query_update = "UPDATE Puntos_Acumulados SET puntos = puntos + 25 WHERE id_usuario = :id_usuario";
        $stmt_update = $conexion->prepare($query_update);
        $stmt_update->bindParam(':id_usuario', $id_usuario, PDO::PARAM_INT);
        $stmt_update->execute();

        if ($stmt_update->rowCount() == 0) {
            $query_insert = "INSERT INTO Puntos_Acumulados (id_usuario, puntos) VALUES (:id_usuario, 25)";
            $stmt_insert = $conexion->prepare($query_insert);
            $stmt_insert->bindParam(':id_usuario', $id_usuario, PDO::PARAM_INT);
            $stmt_insert->execute();
        }

        if ($id_programa_descuento) {
            $query_programa_actual = "
                INSERT INTO Programa_Actual (id_usuario, id_programa) 
                VALUES (:id_usuario, :id_programa)
                ON DUPLICATE KEY UPDATE id_programa = :id_programa
            ";
            $stmt_programa_actual = $conexion->prepare($query_programa_actual);
            $stmt_programa_actual->bindParam(':id_usuario', $id_usuario, PDO::PARAM_INT);
            $stmt_programa_actual->bindParam(':id_programa', $id_programa_descuento, PDO::PARAM_INT);
            $stmt_programa_actual->execute();
        }

        $conexion->commit();

        echo "<p style='color: green; margin-bottom: 1rem;'>¡Gracias por realizar tu compra en La Trenza! Redirigiéndote a la página de inicio.</p>";
        echo "<script>setTimeout(function () { window.location.href = '" . SITE_URL . "'; }, 3000);</script>";
        exit();

    } catch (Exception $e) {
        $conexion->rollBack();
        echo "<p style='color: red; margin-bottom: 1rem;'>Error al procesar la eliminación: " . $e->getMessage() . "</p>";
    }
}

try {
    $conexion = Conexion::getInstance()->getConnection();
    $query = "
        SELECT p.id_producto, p.nombre_producto, p.precio, c.cantidad
        FROM productos p
        INNER JOIN carrito c ON p.id_producto = c.id_producto
        WHERE c.id_usuario = :id_usuario
    ";
    $stmt = $conexion->prepare($query);
    $stmt->bindParam(':id_usuario', $id_usuario, PDO::PARAM_INT);
    $stmt->execute();
    $productos = $stmt->fetchAll();

    if ($productos) {
        $total = 0;
        foreach ($productos as $producto) {
            $precio_mxn = $producto['precio'] * EXCHANGE_RATE;
            $subtotal = $precio_mxn * $producto['cantidad'];
            $total += $subtotal;
        }
        $descuento = $total * ($porcentaje_descuento / 100);
        $total_con_descuento = $total - $descuento;
    } else {
        echo "<p style='color: red; margin-bottom: 1rem;'>Tu carrito está vacío. Agrega productos antes de proceder.</p>";
    }
} catch (Exception $e) {
    echo "<p style='color: red; margin-bottom: 1rem;'>Error al recuperar productos: " . $e->getMessage() . "</p>";
}
?>

<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Finalizar compra</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background: #fff;
            color: #333;
            margin: 0;
            padding: 0;
        }

        .container {
            max-width: 800px;
            margin: 2rem auto;
            padding: 1rem;
        }

        h1 {
            text-align: center;
            color: #333;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 1rem;
        }

        th,
        td {
            padding: 8px;
            border: 1px solid #ccc;
        }

        th {
            background: #f2f2f2;
        }

        .summary {
            padding: 1rem;
            border: 1px solid #ccc;
            margin-bottom: 1rem;
        }

        .summary p {
            margin: 0.5rem 0;
        }

        .btn {
            display: inline-block;
            padding: 10px 20px;
            margin: 5px 0;
            background: #008cba;
            color: #fff;
            text-decoration: none;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }

        .btn-secondary {
            background: #666;
        }
    </style>
</head>

<body>
    <div class="container">
        <h1>Finalizar compra</h1>
        <div class="summary">
            <?php if ($productos): ?>
                <table>
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Precio (MXN)</th>
                            <th>Cantidad</th>
                            <th>Total (MXN)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($productos as $producto): ?>
                            <tr>
                                <td><?php echo $producto['nombre_producto']; ?></td>
                                <td><?php echo number_format($producto['precio'] * EXCHANGE_RATE, 2); ?> MXN</td>
                                <td><?php echo $producto['cantidad']; ?></td>
                                <td><?php
                                $subtotal = $producto['precio'] * EXCHANGE_RATE * $producto['cantidad'];
                                echo number_format($subtotal, 2); ?> MXN
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
                <p>Subtotal: <?php echo number_format($total, 2); ?> MXN</p>
                <?php if ($porcentaje_descuento > 0): ?>
                    <p style="color: green;">Descuento (<?php echo $porcentaje_descuento; ?>%):
                        -<?php echo number_format($descuento, 2); ?> MXN</p>
                <?php endif; ?>
                <p><strong>Total a pagar: <?php echo number_format($total_con_descuento, 2); ?> MXN</strong></p>
                <form method="POST" action="">
                    <button type="submit" name="comprar" class="btn">Confirmar compra</button>
                    <a href="carrito.php" class="btn btn-secondary">Ir al carrito</a>
                </form>
            <?php else: ?>
                <p style="color: red;">Tu carrito está vacío. Agrega productos antes de proceder.</p>
            <?php endif; ?>
        </div>
    </div>
</body>

</html>

<?php include('../footer.php'); ?>
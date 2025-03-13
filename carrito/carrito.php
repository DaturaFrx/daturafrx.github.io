<?php
session_start();
include '../configuracion.php';
include_once('../header.php');

// Verifica que el usuario haya iniciado sesión
if (!isset($_SESSION['usuario']) || !isset($_SESSION['usuario']['id'])) {
    echo "<p class='alert alert-warning'>Por favor, inicia sesión para ver tu carrito.</p>";
    exit();
}

$id_usuario = $_SESSION['usuario']['id'];

try {
    $conexion = Conexion::getInstance()->getConnection();

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $id_producto = isset($_POST['id_producto']) ? intval($_POST['id_producto']) : 0;

        // Actualizar la cantidad (si se ingresa 0, se elimina el producto)
        if (isset($_POST['actualizar']) && $id_producto > 0) {
            $nuevaCantidad = isset($_POST['cantidad']) ? intval($_POST['cantidad']) : 0;
            if ($nuevaCantidad <= 0) {
                // Elimina el producto si la cantidad es 0 o menor
                $stmt = $conexion->prepare("DELETE FROM carrito WHERE id_usuario = :id_usuario AND id_producto = :id_producto");
                $stmt->execute([':id_usuario' => $id_usuario, ':id_producto' => $id_producto]);
            } else {
                // Actualiza la cantidad a la ingresada por el usuario
                $stmt = $conexion->prepare("UPDATE carrito SET cantidad = :cantidad WHERE id_usuario = :id_usuario AND id_producto = :id_producto");
                $stmt->execute([':cantidad' => $nuevaCantidad, ':id_usuario' => $id_usuario, ':id_producto' => $id_producto]);
            }
        }

        if (isset($_POST['comprar'])) {
            header("Location: comprar.php");
            exit();
        }
    }

    // Obtener los productos del carrito
    $stmt = $conexion->prepare("
        SELECT p.id_producto, p.nombre_producto, p.precio, c.cantidad
        FROM productos p
        INNER JOIN carrito c ON p.id_producto = c.id_producto
        WHERE c.id_usuario = :id_usuario
    ");
    $stmt->execute([':id_usuario' => $id_usuario]);
    $productos = $stmt->fetchAll();
} catch (Exception $e) {
    echo "<p class='alert alert-danger'>Error: " . htmlspecialchars($e->getMessage()) . "</p>";
}
?>

<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Carrito de Compras</title>
    <!-- Se elimina el CSS personalizado que no aportaba nada y se usa Bootstrap -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
</head>

<body>
    <header class="text-center">
        <h1>Bienvenido, <?php echo htmlspecialchars($_SESSION['usuario']['nombre']); ?>!</h1>
    </header>

    <div class="container mt-4">
        <?php if ($productos): ?>
            <div class="row">
                <?php foreach ($productos as $producto): ?>
                    <div class="col-md-4">
                        <div class="card p-3 mb-3">
                            <div class="card-body">
                                <h5 class="card-title"><?php echo htmlspecialchars($producto['nombre_producto']); ?></h5>
                                <p class="card-text"><?php echo number_format($producto['precio'], 2); ?> USD</p>
                                <!-- Formulario unificado para actualizar la cantidad -->
                                <form method="POST" action="">
                                    <input type="hidden" name="id_producto" value="<?php echo $producto['id_producto']; ?>">
                                    <div class="mb-3">
                                        <label for="cantidad_<?php echo $producto['id_producto']; ?>"
                                            class="form-label">Cantidad</label>
                                        <input type="number" id="cantidad_<?php echo $producto['id_producto']; ?>"
                                            name="cantidad" class="form-control" value="<?php echo $producto['cantidad']; ?>"
                                            min="0">
                                        <div class="form-text">Ingresa 0 para eliminar el producto.</div>
                                    </div>
                                    <button type="submit" name="actualizar" class="btn btn-primary">Actualizar</button>
                                </form>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        <?php else: ?>
            <h2 class="text-center text-muted">No tienes productos en tu carrito.</h2>
        <?php endif; ?>

        <div class="text-center mt-4">
            <form method="POST" action="">
                <button type="submit" name="comprar" class="btn btn-success">Avanzar a Comprar</button>
            </form>
            <a href="<?php echo SITE_URL; ?>/index.php" class="btn btn-secondary mt-2 mb-10">Volver</a>
        </div>
    </div>
</body>

</html>

<?php include('../footer.php'); ?>
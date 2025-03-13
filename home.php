<?php
$pageTitle = 'Inicio';
require_once 'header.php';
$productosDestacados = getProductosDestacados();
$categorias = getCategorias();
?>

<header class="relative bg-center bg-cover h-96" style="background-image: url('files/bread.jpg');">
    <div class="absolute inset-0 bg-black bg-opacity-50"></div>
    <div class="container mx-auto h-full flex items-center justify-center relative">
        <div class="text-center hero-content">
            <h1 class="text-5xl font-bold mb-4 reveal text-white">Pan Artesanal Recién Horneado</h1>
            <p class="text-xl mb-8 reveal text-white">Descubre el sabor de la tradición en cada bocado</p>
            <a href="<?php echo SITE_URL; ?>/productos/categorias.php"
                class="glow-button bg-pink-600 text-white px-8 py-3 rounded-full hover:bg-pink-700 transition reveal">
                Ver Productos
            </a>
        </div>
    </div>
</header>

<?php
try {
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8",
        DB_USER,
        DB_PASS,
        array(PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION)
    );

    $stmt = $pdo->prepare("
        SELECT 
            p.id_producto,
            p.nombre_producto,
            p.descripcion,
            p.precio,
            GROUP_CONCAT(DISTINCT f.url_foto ORDER BY f.id_foto ASC) as fotos_urls
        FROM productos p 
        LEFT JOIN fotos f ON p.id_producto = f.id_producto 
        GROUP BY 
            p.id_producto,
            p.nombre_producto,
            p.descripcion,
            p.precio
        ORDER BY p.id_producto ASC
    ");
    $stmt->execute();
    $productos = $stmt->fetchAll(PDO::FETCH_ASSOC);

} catch (PDOException $e) {
    error_log("Database Error: " . $e->getMessage());
    $productos = [];
}

// Default image URL if none is provided
$default_image = 'https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png';
?>

<section class="py-16 bg-gray-50">
    <div class="container mx-auto px-4">
        <h2 class="section-header text-3xl font-bold text-center mb-12 reveal text-black">
            Nuestros Productos
        </h2>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 reveal">
            <?php if (!empty($productos)): ?>
                <?php foreach ($productos as $producto):
                    $fotos_urls = !empty($producto['fotos_urls'])
                        ? array_filter(explode(',', $producto['fotos_urls']))
                        : [];


                    $primary_image = !empty($fotos_urls[0]) ? $fotos_urls[0] : $default_image;
                    ?>
                    <div
                        class="product-card bg-white rounded-lg shadow-md overflow-hidden text-center hover:shadow-lg transition-shadow duration-300">
                        <!-- Product Image Container -->
                        <div class="h-48 overflow-hidden relative group">
                            <a href="<?php echo htmlspecialchars($primary_image); ?>" target="_blank" class="block h-full">
                                <img src="<?php echo htmlspecialchars($primary_image); ?>"
                                    alt="<?php echo htmlspecialchars($producto['nombre_producto']); ?>"
                                    class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    loading="lazy" onerror="this.src='<?php echo $default_image; ?>'">
                            </a>

                            <!-- Image Navigation Dots -->
                            <?php if (count($fotos_urls) > 1): ?>
                                <div class="absolute bottom-2 left-0 right-0 flex justify-center gap-2 z-10">
                                    <?php foreach ($fotos_urls as $index => $foto): ?>
                                        <?php if (!empty($foto)): ?>
                                            <button class="w-2 h-2 rounded-full bg-white opacity-70 hover:opacity-100 transition-opacity duration-200 
                                                       <?php echo $index === 0 ? 'opacity-100' : ''; ?>"
                                                data-image="<?php echo htmlspecialchars($foto); ?>"
                                                data-default="<?php echo htmlspecialchars($default_image); ?>"
                                                onclick="changeProductImage(this)"
                                                aria-label="Ver imagen <?php echo $index + 1; ?>"></button>
                                        <?php endif; ?>
                                    <?php endforeach; ?>
                                </div>
                            <?php endif; ?>
                        </div>

                        <div class="p-6">
                            <h3 class="text-xl font-bold mb-2 text-black">
                                <?php echo htmlspecialchars($producto['nombre_producto']); ?>
                            </h3>

                            <?php if (!empty($producto['descripcion'])): ?>
                                <p class="text-gray-600 mb-4 line-clamp-2">
                                    <?php echo htmlspecialchars($producto['descripcion']); ?>
                                </p>
                            <?php endif; ?>

                            <p class="text-lg font-bold text-pink-600 mb-4">
                                $<?php echo number_format($producto['precio'], 2); ?>
                            </p>

                            <a href="<?php echo SITE_URL; ?>/productos/producto.php?id=<?php echo $producto['id_producto']; ?>" class="glow-button inline-block bg-pink-600 text-black px-6 py-2 rounded-full 
                                       hover:bg-pink-700 transition-colors duration-300">
                                Ver Detalles
                            </a>
                        </div>
                    </div>
                <?php endforeach; ?>
            <?php else: ?>
                <div class="col-span-3 text-center text-gray-600 py-8">
                    <p>No hay productos disponibles en este momento.</p>
                </div>
            <?php endif; ?>
        </div>
    </div>
</section>

<script>
    function changeProductImage(button) {
        const newImageUrl = button.getAttribute('data-image');
        const defaultImage = button.getAttribute('data-default');
        const card = button.closest('.product-card');
        const mainImage = card.querySelector('img');
        const mainImageLink = mainImage.closest('a');

        // Update image source and link
        mainImage.src = newImageUrl;
        mainImageLink.href = newImageUrl;

        mainImage.onerror = function () {
            this.src = defaultImage;
            mainImageLink.href = defaultImage;
        };

        card.querySelectorAll('button').forEach(dot => dot.classList.remove('opacity-100'));
        button.classList.add('opacity-100');
    }
</script>

<script>
    function changeProductImage(button) {
        const newImageUrl = button.dataset.image;
        const card = button.closest('.product-card');
        const mainImage = card.querySelector('.main-image');
        mainImage.src = newImageUrl;

        const dots = card.querySelectorAll('.thumbnail-dot');
        dots.forEach(dot => dot.classList.remove('bg-pink-600'));
        button.classList.add('bg-pink-600');
    }
</script>


<section class="py-16">
    <div class="container mx-auto px-4">
        <h2 class="section-header text-3xl font-bold text-center mb-12 reveal text-black">Productos Destacados</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <?php foreach ($productosDestacados as $producto): ?>
                <div class="product-card bg-white rounded-lg shadow-md overflow-hidden reveal">
                    <div class="p-4">
                        <h3 class="font-bold text-xl mb-2 text-black"><?php echo $producto['nombre_producto']; ?></h3>
                        <p class="text-black mb-4"><?php echo $producto['descripcion']; ?></p>
                        <div class="flex justify-between items-center">
                            <span class="text-xl font-bold text-pink-600 price-tag">
                                $<?php echo formatearPrecio($producto['precio']); ?>
                            </span>
                            <button onclick="agregarAlCarrito(<?php echo $producto['id_producto']; ?>)"
                                class="cart-button glow-button bg-pink-600 text-black px-4 py-2 rounded hover:bg-pink-700 transition">
                                Agregar al Carrito
                            </button>
                        </div>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
    </div>
</section>

<script>
    function agregarAlCarrito(id_producto) {
        const cantidad = 1;

        const formData = new FormData();
        formData.append('id_producto', id_producto);
        formData.append('cantidad', cantidad);

        fetch('carrito.php', {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Producto agregado al carrito!');
                } else {
                    alert('Error al agregar el producto. Inténtalo de nuevo.');
                }
            })
            .catch(error => console.error('Error:', error));
    }
</script>

<section class="py-16 bg-pink-50 flex items-center justify-center">
    <div class="container mx-auto px-4">
        <div class="max-w-2xl mx-auto text-center reveal">
            <h2 class="section-header text-3xl font-bold mb-6 text-black">Suscríbete a Nuestro Newsletter</h2>
            <p class="text-black mb-8">Recibe las últimas novedades y ofertas especiales directamente en tu correo.</p>
            <form class="flex flex-col md:flex-row gap-4 justify-center items-center" id="newsletterForm">
                <input type="email"
                    class="px-4 py-2 rounded-full border-2 border-pink-200 focus:border-pink-400 focus:outline-none flex-1 max-w-md"
                    placeholder="Tu correo electrónico" required>
                <button type="submit"
                    class="glow-button bg-pink-600 text-black px-8 py-2 rounded-full hover:bg-pink-700 transition">
                    Suscribirse
                </button>
            </form>
        </div>
    </div>
</section>

<section class="py-16">
    <div class="container mx-auto px-4">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div class="text-center reveal">
                <div class="mb-4">
                    <i class="fas fa-bread-slice text-4xl text-pink-600"></i>
                </div>
                <h3 class="text-xl font-bold mb-2 text-black">Frescura Garantizada</h3>
                <p class="text-black">Horneamos nuestros productos todos los días</p>
            </div>
            <div class="text-center reveal">
                <div class="mb-4">
                    <i class="fas fa-truck text-4xl text-pink-600"></i>
                </div>
                <h3 class="text-xl font-bold mb-2 text-black">Entrega a Domicilio</h3>
                <p class="text-black">Llevamos nuestros productos hasta tu puerta</p>
            </div>
            <div class="text-center reveal">
                <div class="mb-4">
                    <i class="fas fa-star text-4xl text-pink-600"></i>
                </div>
                <h3 class="text-xl font-bold mb-2 text-black">Calidad Premium</h3>
                <p class="text-black">Ingredientes seleccionados de la mejor calidad</p>
            </div>
        </div>
    </div>
</section>

<script src="<?php echo SITE_URL; ?>/js/animations.js"></script>
<script>
    function agregarAlCarrito(idProducto) {
        fetch(`${SITE_URL}/carrito.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'add',
                product_id: idProducto,
                quantity: 1
            })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    actualizarContadorCarrito(data.cartCount);
                    mostrarNotificacion('Producto agregado al carrito', 'success');
                } else {
                    mostrarNotificacion('Error al agregar el producto', 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                mostrarNotificacion('Error al agregar el producto', 'error');
            });
    }

    document.getElementById('newsletterForm').addEventListener('submit', function (e) {
        e.preventDefault();
        mostrarNotificacion('¡Gracias por suscribirte!', 'success');
    });
</script>

<?php require_once 'footer.php'; ?>
-- ============================================================
-- GRIT BURGER POS — Admin Setup
-- Correr en Supabase → SQL Editor
-- ============================================================

-- 1. Tabla de configuración general
create table if not exists config (
  key   text primary key,
  value text not null
);

insert into config (key, value) values
  ('num_mesas',  '4'),
  ('admin_pin',  '1234')
on conflict (key) do nothing;

-- 2. Tabla de items del menú
create table if not exists menu_items (
  id          text    primary key,
  categoria   text    not null,
  name        text    not null,
  descripcion text    default '',
  price       numeric not null,
  disponible  boolean default true,
  orden       integer default 0
);

-- 3. Seed con el menú actual
insert into menu_items (id, categoria, name, descripcion, price, disponible, orden) values
-- Promociones
('p1','promociones','12 Alitas','2 sabores + papas + ½L chicha',39,true,1),
('p2','promociones','Dúo Burger Royal','2 Royal + ½L chicha gratis',32,true,2),
('p3','promociones','Salchi Papa Royal','2 salchipapas Royal + Inka Kola 600ml',32,true,3),
('p4','promociones','Combo Para 2','Salchipapa mixta para 2 + ½L chicha',31,true,4),
-- Hamburguesas
('h1','hamburguesas','Clásica','Pan brioche, carne, tomate, lechuga, papas',13,true,1),
('h2','hamburguesas','Royal','Pan brioche, carne, queso, jamón, tomate, lechuga, papas',16,true,2),
('h3','hamburguesas','Ranchera','Carne, queso, jamón, chorizo, tomate, lechuga, papas',17,true,3),
('h4','hamburguesas','A lo Pobre','Carne, huevo, queso cheddar, plátano frito, papas',17,true,4),
('h5','hamburguesas','Pollo Deshilachado','Pollo deshilachado, queso, jamón, huevo, papas',16,true,5),
-- Alitas
('a1','alitas','BBQ','6 alitas crujientes + papas',20,true,1),
('a2','alitas','BBQ Picante','6 alitas ahumadas picantes + papas',20,true,2),
('a3','alitas','BBQ Maracuyá','6 alitas dulce ahumado maracuyá + papas',20,true,3),
('a4','alitas','Acevichada','6 alitas salsa acevichada + papas',20,true,4),
('a5','alitas','Buffalo','6 alitas estilo americano picante + papas',20,true,5),
('a6','alitas','Maracuyá','6 alitas reducción dulce + papas',20,true,6),
('a7','alitas','Crispy','6 alitas extra crujientes sin salsa + papas',20,true,7),
('a8','alitas','Honey Mustard','6 alitas miel y mostaza + papas',20,true,8),
('a9','alitas','Teriyaki','6 alitas salsa oriental dulce + papas',20,true,9),
-- Salchipapas
('s1','salchipapas','Clásica','Hot dog ahumado + papas fritas',12,true,1),
('s2','salchipapas','Royal','Hot dog, papas, huevo, queso',16,true,2),
('s3','salchipapas','Mixta','Hot dog, chorizo parrillero, papas',17,true,3),
('s4','salchipapas','A lo Pobre','Hot dog, queso, huevo, plátano, papas',17,true,4),
('s5','salchipapas','Nuggets','Hot dog, nuggets de pollo, papas',19,true,5),
('s6','salchipapas','Nuggets a lo Pobre','Hot dog, nuggets, plátano, papas',20,true,6),
('s7','salchipapas','Burger','Hot dog, hamburguesa en trozos, papas',17,true,7),
-- Bebidas
('b1','bebidas','Limonada Clásica (vaso)','Vaso',6,true,1),
('b2','bebidas','Limonada Clásica (litro)','Litro',14,true,2),
('b3','bebidas','Limonada Hierba Luisa (vaso)','Vaso',6,true,3),
('b4','bebidas','Limonada Hierba Luisa (litro)','Litro',14,true,4),
('b5','bebidas','Limonada Frozen (vaso)','Vaso',7,true,5),
('b6','bebidas','Limonada Frozen (litro)','Litro',17,true,6),
('b7','bebidas','Maracuyá (vaso)','Vaso',6,true,7),
('b8','bebidas','Maracuyá (litro)','Litro',14,true,8),
('b9','bebidas','Maracuyá Frozen (vaso)','Vaso',7,true,9),
('b10','bebidas','Maracuyá Frozen (litro)','Litro',17,true,10),
('b11','bebidas','Chicha Morada (vaso)','Vaso',6,true,11),
('b12','bebidas','Chicha Morada (litro)','Litro',14,true,12),
('b13','bebidas','Inka Kola 600ml','Botella',3,true,13),
('b14','bebidas','Coca Cola 600ml','Botella',3,true,14),
('b15','bebidas','Agua San Mateo','Botella',3,true,15),
-- Complementos/Extras
('e1','complementos','Huevo frito','Extra',2,true,1),
('e2','complementos','Hot dog ahumado','Extra',2,true,2),
('e3','complementos','Queso','Extra',2,true,3),
('e4','complementos','Jamón','Extra',1.5,true,4),
('e5','complementos','Chorizo','Extra',2.5,true,5),
('e6','complementos','Plátano frito','Extra',2,true,6),
('e7','complementos','Porción de papas','Extra',7,true,7)
on conflict (id) do nothing;

-- 4. Habilitar RLS y políticas (igual que pedidos)
alter table config     enable row level security;
alter table menu_items enable row level security;

create policy "Acceso autenticado config"
  on config for all using (auth.role() = 'authenticated');

create policy "Acceso autenticado menu_items"
  on menu_items for all using (auth.role() = 'authenticated');

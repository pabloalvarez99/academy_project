CREATE TABLE customers (
    id      INTEGER PRIMARY KEY,
    name    TEXT    NOT NULL,
    city    TEXT,
    country TEXT
);
INSERT INTO customers VALUES
    (1, 'Alfreds Futterkiste',  'Berlin',       'Germany'),
    (2, 'Ana Trujillo',         'México D.F.',  'Mexico'),
    (3, 'Antonio Moreno',       'México D.F.',  'Mexico'),
    (4, 'Around the Horn',      'London',       'UK'),
    (5, 'Berglunds snabbköp',   'Luleå',        'Sweden');

CREATE TABLE orders (
    id          INTEGER PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    order_date  TEXT,
    amount      REAL
);
INSERT INTO orders VALUES
    (1, 1, '2024-01-15', 250.00),
    (2, 2, '2024-01-16',  89.50),
    (3, 1, '2024-02-01', 430.00),
    (4, 3, '2024-02-10', 120.00),
    (5, 4, '2024-02-12', 310.00);

CREATE TABLE products (
    id    INTEGER PRIMARY KEY,
    name  TEXT    NOT NULL,
    price REAL    NOT NULL,
    stock INTEGER NOT NULL
);
INSERT INTO products VALUES
    (1, 'Widget A',    9.99,  100),
    (2, 'Widget B',   19.99,   50),
    (3, 'Gadget Pro', 99.99,   25),
    (4, 'Basic Tool',  4.99,  200),
    (5, 'Pro Tool',   49.99,   30);

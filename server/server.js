const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');
const nodemailer = require('nodemailer');
const mailgun = require('mailgun-js');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, 'database.sqlite')
});

const Booking = sequelize.define('Booking', {
    name: DataTypes.STRING,
    email: DataTypes.STRING,
    item: DataTypes.STRING,
    quantity: DataTypes.INTEGER,
    startDate: DataTypes.STRING,
    endDate: DataTypes.STRING,
    remark: DataTypes.STRING,
    isReturned: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
});

sequelize.sync();

app.get('/users', (req, res) => {
    fs.readFile(path.join(__dirname, 'Users', 'users.json'), (err, data) => {
        if (err) return res.status(500).send('Error reading users file');
        res.setHeader('Content-Type', 'application/json');
        res.send(data);
    });
});

app.get('/equipments', async (req, res) => {
    try {
        const equipmentPath = path.join(__dirname, 'Equipments', 'equipments.json');
        const rawData = fs.readFileSync(equipmentPath);
        const equipmentList = JSON.parse(rawData);

        const bookings = await Booking.findAll({ where: { isReturned: false } });

        const quantityMap = {};
        bookings.forEach(b => {
            if (!quantityMap[b.item]) quantityMap[b.item] = 0;
            quantityMap[b.item] += b.quantity;
        });

        equipmentList.forEach(eq => {
            eq.available_quantity = eq.quantity - (quantityMap[eq.name] || 0);
        });

        res.json(equipmentList);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read equipment data' });
    }
});

app.post('/equipments', (req, res) => {
    try {
        const equipmentPath = path.join(__dirname, 'Equipments', 'equipments.json');
        const colorsPath = path.join(__dirname, 'Equipments', 'classColors.json');
        const rawData = fs.readFileSync(equipmentPath);
        let equipmentList = JSON.parse(rawData);

        const { name, class: eqClass, quantity } = req.body;
        if (!name || !eqClass || !quantity) {
            return res.status(400).json({ message: 'Missing required fields.' });
        }

        let classColors = {};
        if (fs.existsSync(colorsPath)) {
            classColors = JSON.parse(fs.readFileSync(colorsPath));
        }

        const palette = [
            '#1abc9c', '#e67e22', '#3498db', '#9b59b6', '#e74c3c', '#f1c40f', '#2ecc71', '#34495e', '#fd79a8', '#00b894', '#636e72', '#fdcb6e', '#00cec9', '#6c5ce7', '#b2bec3'
        ];

        if (!classColors[eqClass]) {
            const usedColors = Object.values(classColors);
            const availableColors = palette.filter(c => !usedColors.includes(c));
            classColors[eqClass] = availableColors.length ? availableColors[0] : palette[Math.floor(Math.random() * palette.length)];
            fs.writeFileSync(colorsPath, JSON.stringify(classColors, null, 2));
        }
        const newId = equipmentList.length ? Math.max(...equipmentList.map(eq => eq.id)) + 1 : 1;
        const newEquipment = {
            id: newId,
            name,
            class: eqClass,
            quantity,
            available_quantity: quantity
        };
        equipmentList.push(newEquipment);
        fs.writeFileSync(equipmentPath, JSON.stringify(equipmentList, null, 2));
        res.status(201).json(newEquipment);
    } catch (err) {
        res.status(500).json({ message: 'Failed to add equipment.' });
    }
});

app.put('/equipments/:id', (req, res) => {
    try {
        const equipmentPath = path.join(__dirname, 'Equipments', 'equipments.json');
        const rawData = fs.readFileSync(equipmentPath);
        let equipmentList = JSON.parse(rawData);

        const id = parseInt(req.params.id, 10);
        const { name, class: eqClass, quantity } = req.body;
        const idx = equipmentList.findIndex(eq => eq.id === id);
        if (idx === -1) {
            return res.status(404).json({ message: 'Equipment not found.' });
        }
        equipmentList[idx].name = name;
        equipmentList[idx].class = eqClass;
        equipmentList[idx].quantity = quantity;
        equipmentList[idx].available_quantity = quantity; // reset available_quantity
        fs.writeFileSync(equipmentPath, JSON.stringify(equipmentList, null, 2));
        res.json(equipmentList[idx]);
    } catch (err) {
        res.status(500).json({ message: 'Failed to update equipment.' });
    }
});

app.delete('/equipments/:id', (req, res) => {
    try {
        const equipmentPath = path.join(__dirname, 'Equipments', 'equipments.json');
        const rawData = fs.readFileSync(equipmentPath);
        let equipmentList = JSON.parse(rawData);

        const id = parseInt(req.params.id, 10);
        const idx = equipmentList.findIndex(eq => eq.id === id);
        if (idx === -1) {
            return res.status(404).json({ message: 'Equipment not found.' });
        }
        equipmentList.splice(idx, 1);
        fs.writeFileSync(equipmentPath, JSON.stringify(equipmentList, null, 2));
        res.json({ message: 'Equipment removed.' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to remove equipment.' });
    }
});

app.get('/bookings', async (req, res) => {
    try {
        const bookings = await Booking.findAll();
        res.json(bookings);
    } catch (err) {
        res.status(500).send("Error retrieving bookings");
    }
});

app.post('/bookings', async (req, res) => {
    try {
        const { name, email, bookings } = req.body;

        const equipmentPath = path.join(__dirname, 'Equipments', 'equipments.json');
        const rawData = fs.readFileSync(equipmentPath);
        const equipmentList = JSON.parse(rawData);

        for (const b of bookings) {
            const item = equipmentList.find(e => e.name === b.item);
            if (!item) {
                return res.status(400).json({ message: `Item not found: ${b.item}` });
            }

            const totalBooked = await Booking.sum('quantity', {
                where: { item: b.item }
            }) || 0;

            const available = item.quantity - totalBooked;
            if (available < b.quantity) {
                return res.status(400).json({ message: `Not enough quantity for ${b.item}` });
            }
        }

        const createdBookings = await Promise.all(
            bookings.map(b => Booking.create({ name, email, ...b }))
        );

        sendConfirmationEmail(name, email, bookings);

        res.status(201).json({ message: 'Booking saved', data: createdBookings });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

const sendConfirmationEmail = (name, email, bookings) => {
    const bookingList = bookings.map(b =>
        `• ${b.quantity} x ${b.item} (${b.startDate} -> ${b.endDate})`
    ).join('\n');

    const data = {
        from: 'ASE <postmaster@sandboxba30e128476d448faf5d19a040255b70.mailgun.org>',
        to: email,
        subject: `${name} - ASE Equipment Booking Confirmation`,
        text: `Hi ${name},\n\nThank you for your booking:\n\n${bookingList}\n\nWe'll be in touch if needed.\n\nBest,\nASE`
    };

    mg.messages().send(data, function (error, body){
        if (error) {
            console.error("Mailgun send error:", error);
        } else {
            console.log("Mailgun send success:", body);
        }
    });
};

app.delete('/bookings', async (req, res) => {
    try {
        await Booking.destroy({ where: {} });
        res.status(200).json({ message: 'All bookings deleted.' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete bookings.' });
    }
});

app.get('/', (req, res) => {
    res.send('Unified Backend Server is running.');
});

app.put('/bookings/:id/return', async (req, res) => {
    try {
        const id = req.params.id;
        const booking = await Booking.findByPk(id);

        if (!booking || booking.isReturned) {
            return res.status(400).json({ message: 'Invalid or already returned' });
        }

        booking.isReturned = true;
        await booking.save();
        
        res.status(200).json({ message: 'Marked as returned' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to verify return' });
    }
});

app.get('/calendar-events', async (req, res) => {
    try {
        const bookings = await Booking.findAll();

        const equipmentPath = path.join(__dirname, 'Equipments', 'equipments.json');
        let equipmentList;
        try {
            const rawEquipment = fs.readFileSync(equipmentPath, 'utf-8');
            equipmentList = JSON.parse(rawEquipment);
        } catch (err) {
            console.error("Failed to read or parse equipments.json:", err);
            return res.status(500).json({ message: "Error loading equipment data" });
        }
        
        const equipmentMap = {};
        equipmentList.forEach(eq => {
            equipmentMap[eq.name] = eq.class;
        });

        const events = bookings.map(b => {
            const equipmentClass = equipmentMap[b.item] || 'uncategorized';

            const colorMap = {
                field: '#1e90ff',
                safety: '#28a745',
                lab: '#ffc107'
            };

            return {
                title: `${b.item} (${b.quantity})`,
                start: b.startDate,
                end: b.endDate,
                allDay: true,
                backgroundColor: colorMap[equipmentClass],
                borderColor: colorMap[equipmentClass],
                extendedProps: {
                    item: b.item,
                    quantity: b.quantity,
                    name: b.name,
                    email: b.email,
                    remark: b.remark,
                    isReturned: b.isReturned,
                    startDate: b.startDate,
                    endDate: b.endDate,
                    class: equipmentClass
                }
            };
        });

        res.json(events);
    } catch (err) {
        console.error("Calendar event error:", err);
        res.status(500).json({ message: "Failed to load calendar events" });
    }
});

app.get('/class-colors', (req, res) => {
    const colorsPath = path.join(__dirname, 'Equipments', 'classColors.json');
    if (fs.existsSync(colorsPath)) {
        res.setHeader('Content-Type', 'application/json');
        res.send(fs.readFileSync(colorsPath));
    } else {
        res.json({ field: '#1abc9c', safety: '#e67e22', lab: '#3498db' });
    }
});

app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
});
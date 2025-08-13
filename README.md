# Profit-Pulse

Profit-Pulse is a web application for managing inventory, sales transactions, and customer dues. It helps you track stock, record transactions, monitor expiring items, and manage pending payments with ease.

## Features
- Inventory (Stock) management
- Transaction recording (sales, giving items, etc.)
- Expiry tracking for perishable goods
- Dashboard with profit/loss, stock, expiry, and dues overview
- Customer dues management with payment tracking
- Firebase authentication and Firestore backend

## Tech Stack
- React (with Vite)
- Firebase (Auth & Firestore)
- CSS Modules

## Getting Started
1. Clone the repository:
	```sh
	git clone https://github.com/AmalJoy14/Profit-Pulse.git
	```
2. Install dependencies:
	```sh
	cd Profit-Pulse/frontend
	npm install
	```
3. Set up your Firebase project and update `src/firebase/config.js` with your credentials.
4. Start the development server:
	```sh
	npm run dev
	```
5. Open [http://localhost:5173](http://localhost:5173) in your browser.

## Usage
- Add and manage stock items.
- Record transactions (sales, disposals, etc.).
- Track items nearing expiry and expired goods.
- Manage customer dues and record payments.

## License
MIT
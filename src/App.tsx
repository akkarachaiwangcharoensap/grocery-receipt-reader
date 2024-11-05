import React from 'react';
import { Routes, Route } from 'react-router-dom';

import Dashboard from './Dashboard';
import Receipt from './Receipt';
import ImageUpload from './components/ImageUpload';
import Login from './components/auth/Login';
import Register from './components/auth/Register';

import './App.css';

const App: React.FC = () => {
	return (
		<div className="App">
			<Routes>
				<Route path="/" element={<Dashboard />} />
				<Route path="/receipts/:id" element={<Receipt />} />
				<Route path="/upload" element={<ImageUpload />} />
				<Route path="/login" element={<Login />} />
				<Route path="/register" element={<Register />} />
			</Routes>
		</div>
	);
};

export default App;
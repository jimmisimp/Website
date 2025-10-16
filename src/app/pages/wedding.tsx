import React, { useState } from 'react';

export const Wedding: React.FC = () => {
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [guests, setGuests] = useState(1);
	const [submitted, setSubmitted] = useState(false);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const rsvpData = { name, email, guests };
		console.log('RSVP Submission:', rsvpData);
		setSubmitted(true);
		setTimeout(() => {
			setName('');
			setEmail('');
			setGuests(1);
			setSubmitted(false);
		}, 2000);
	};

    return (
        <div>
            <h1 className="name">Wedding RSVP</h1>
			{submitted ? (
				<div className="success-message">
					<p>Thank you for your RSVP, {name}!</p>
				</div>
			) : (
				<form onSubmit={handleSubmit} className="flex flex-col gap-2">
					<input 
						type="text" 
						placeholder="Enter your name" 
						value={name}
						onChange={(e) => setName(e.target.value)}
						required
					/>
					<input 
						type="email" 
						placeholder="Enter your email" 
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						required
					/>
					<input 
						type="number" 
						value={guests}
						onChange={(e) => setGuests(parseInt(e.target.value))}
						min={1} 
						max={4} 
					/>
					<button type="submit" className="main-button">Submit</button>
				</form>
			)}
        </div>
    );
};
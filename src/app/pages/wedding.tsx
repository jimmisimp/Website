import React, { useState, useEffect } from 'react';
import { useOpenAI } from '@/lib/hooks';
import type { RSVPData } from '@/lib/types';

const CELEBRATION_COLORS = ['#9e7e27', '#46285a'];

export const Wedding: React.FC = () => {
	const [inputText, setInputText] = useState('');
	const [originalText, setOriginalText] = useState('');
	const [stage, setStage] = useState<'input' | 'parsing' | 'review' | 'generating' | 'complete'>('input');
	const [parsedData, setParsedData] = useState<RSVPData | null>(null);
	const [message, setMessage] = useState('');
	const [isEditing, setIsEditing] = useState(false);
	const [isRejected, setIsRejected] = useState(false);
	const { generateText, parseRSVP, moderateText } = useOpenAI();

	useEffect(() => {
		if (stage !== 'input') {
			const randomColor = CELEBRATION_COLORS[Math.floor(Math.random() * CELEBRATION_COLORS.length)];
			document.documentElement.style.transition = 'background-color 1.5s ease-in-out';
			document.documentElement.style.backgroundColor = randomColor;
		}
		return () => {
			if (stage === 'input') {
				document.documentElement.style.backgroundColor = '';
			}
		};
	}, [stage]);

	const encode = (data: Record<string, string | number>) => {
		return Object.keys(data)
			.map(key => encodeURIComponent(key) + "=" + encodeURIComponent(data[key]))
			.join("&");
	};

	const handleTextSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!inputText.trim()) return;
		const cleanInput = await cleanSafeInput(inputText);
		if (!cleanInput) return;

		const isUpdate = !!originalText;
		if (!originalText) {
			setOriginalText(cleanInput);
		}

		setStage('parsing');
		setIsEditing(false);

		try {
			const parseInput = isUpdate
				? `The user asked to update their information. Original submission: "${originalText}". Updated submission: "${cleanInput}"`
				: cleanInput;

			await parseRSVP({
				input: parseInput,
				onParsed: (data) => {
					if (data.names.includes('ERROR')) {
						setMessage('ERROR: ' + data.details + '\nIf you are having issues, please contact Adam or Shannon.');
						setParsedData({ names: ['ERROR'], contact: '', contactType: 'email', guestCount: 0});
						setIsRejected(true);
						setStage('complete');
						setInputText('');
						return;
					}

					setParsedData(data);
					setStage('review');
				}
			});
		} catch (error) {
			console.error('Error parsing RSVP:', error);
			setStage(isUpdate ? 'review' : 'input');
		}
	};

	const cleanSafeInput = async (input: string) => {
		let cleanInput = input.replace(/[^a-zA-Z0-9\s@.,-]/g, '').trim();
		console.log('Clean input:', cleanInput);
		cleanInput = await moderateText(cleanInput);
		return cleanInput;
	};

	const handleConfirm = async () => {
		if (!parsedData) return;

		setStage('generating');

		try {
			await fetch("/", {
				method: "POST",
				headers: { "Content-Type": "application/x-www-form-urlencoded" },
				body: encode({
					"form-name": "wedding-rsvp",
					names: parsedData.names.join(', '),
					contact: parsedData.contact,
					contactType: parsedData.contactType,
					guests: parsedData.guestCount,
					details: parsedData.details || '',
					originalText: originalText
				})
			});

			await generateText({
				setText: setMessage,
				scrollRef: undefined,
				onDone: () => setStage('complete'),
				instructions: `Write a message thanking ${parsedData.names.join(' and ')} for RSVPing to Shannon and Adam's wedding on October 24th. They registered ${parsedData.guestCount} guest${parsedData.guestCount > 1 ? 's' : ''}. Keep it under 100 words. Try to make it a bit funny and sarcastic somehow. Refer to the registrants by their first names only. No emojis. (The original submission from the user was: "${originalText}")`
			});
		} catch (error) {
			console.error('Error submitting RSVP:', error);
			setStage('review');
		}
	};

	const handleEdit = () => {
		setIsEditing(true);
		setInputText('');
	};

	const handleReset = () => {
		setInputText('');
		setOriginalText('');
		setStage('input');
		setMessage('');
		setParsedData(null);
		setIsEditing(false);
		document.documentElement.style.backgroundColor = '';
	};

	return (
		<div className="wedding-wrapper">
			<div className="wedding-header">
				<div className="names">Shannon & Adam</div>
				<div className="event-details">
					<span className="date">October 24th, 2026</span>
					<span className="separator">•</span>
					<span className="time">6:00 PM</span>
				</div>
				<a href="https://maps.app.goo.gl/JjX49Gxdoi2Gs2w48" target="_blank" rel="noopener noreferrer" className="venue">
					The Society of Colonial Dames
				</a>
			</div>

			{stage === 'input' && (
				<form onSubmit={handleTextSubmit} className="text-input-form fade-in form-container">
					<label htmlFor="rsvpText">Let us know who's coming</label>
					<span className="subtext">Include names, contact, and the number of guests, as well as any other details you'd like to share.</span>
					<textarea
						name="rsvpText"
						placeholder="e.g. Shannon and Adam will be there! Contact me at shannon@email.com. I'll be bringing 2 guests."
						value={inputText}
						autoComplete='off'
						autoFocus
						onChange={(e) => setInputText(e.target.value)}
						className="text-input"
						rows={4}
						maxLength={1000}
						required
						disabled={isRejected}
					/>
					<button type="submit" className="form-submit" disabled={isRejected}>Continue</button>
				</form>
			)}

			{stage === 'parsing' && (
				<div className="generating-message fade-in">
					<div className="spinner" />
					<p>Please wait while we check your RSVP...</p>
				</div>
			)}

			{stage === 'review' && parsedData && (
				<div className="review-container fade-in">
					<p className="review-prompt">Does this information look correct?</p>

					<div className="details-card">
						<h3>RSVP Details</h3>
						<ul className="details-list">
							<li>
								<span className="label">Attendees</span>
								<span className="value">{parsedData.names.join(', ')}</span>
							</li>
							<li>
								<span className="label">Contact</span>
								<span className="value">{parsedData.contact || 'Not provided'}</span>
							</li>
							<li>
								<span className="label">Guest Count</span>
								<span className="value">{parsedData.guestCount}</span>
							</li>
							{parsedData.details && (
								<li>
									<span className="label">Special Notes</span>
									<span className="value">{parsedData.details}</span>
								</li>
							)}
						</ul>
					</div>

					{!isEditing && (
						<div className="button-group">
							<button onClick={handleConfirm} className="confirm-button">
								Looks Good!
							</button>
							<button onClick={handleEdit} className="edit-button">
								Edit Details
							</button>
						</div>
					)}

					{isEditing && (
						<form onSubmit={handleTextSubmit} className="edit-form fade-in form-container">
							<label htmlFor="rsvpTextEdit">Update your RSVP</label>
							<span className="subtext">Tell us what you'd like to update.</span>
							<textarea
								name="rsvpTextEdit"
								placeholder="e.g. There are 3 total guests, not 2."
								value={inputText}
								autoComplete='off'
								onChange={(e) => setInputText(e.target.value)}
								className="text-input"
								rows={4}
								required
							/>
							<button type="submit" className="form-submit">Update</button>
						</form>
					)}
				</div>
			)}

			{stage === 'generating' && (
				<div className="generating-message fade-in">
					<div className="spinner" />
					<p>Confirming your RSVP...</p>
				</div>
			)}

			{stage === 'complete' && parsedData && (
				<div className="success-container fade-in">
					<div className="ai-message">{message}</div>

					<div className="details-card slide-up">
						<h3>Registration Confirmed</h3>
						<ul className="details-list">
							<li>
								<span className="label">Attendees</span>
								<span className="value">{parsedData.names.join(', ')}</span>
							</li>
							<li>
								<span className="label">Contact</span>
								<span className="value">{parsedData.contact || 'Not provided'}</span>
							</li>
							<li>
								<span className="label">Guests</span>
								<span className="value">{parsedData.guestCount}</span>
							</li>
							{parsedData.details && (
								<li>
									<span className="label">Special Notes</span>
									<span className="value">{parsedData.details}</span>
								</li>
							)}
						</ul>
					</div>

					<button onClick={handleReset} className="reset-button fade-in-delay">
						Submit Another
					</button>
				</div>
			)}
		</div>
	);
};
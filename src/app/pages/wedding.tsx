import React, { useState, useEffect } from 'react';
import { useOpenAI } from '@/lib/hooks';
import type { RSVPData } from '@/lib/types';

const CELEBRATION_COLORS = [
	{ bg: '#001D33', flower: '#EDEBDE' },
	{ bg: '#EDEBDE', flower: '#001D33' },
	{ bg: '#EDEBDE', flower: '#A1753C' },
	{ bg: '#AD834C', flower: '#001D33' },
	{ bg: '#001D33', flower: '#FCEC88' },
];

export const Wedding: React.FC = () => {
	const [inputText, setInputText] = useState('');
	const [originalText, setOriginalText] = useState('');
	const [stage, setStage] = useState<'intro' | 'input' | 'parsing' | 'review' | 'generating' | 'complete' | 'gift'>('intro');
	const [parsedData, setParsedData] = useState<RSVPData | null>(null);
	const [message, setMessage] = useState('');
	const [isEditing, setIsEditing] = useState(false);
	const [isRejected, setIsRejected] = useState(false);
	const [giftStage, setGiftStage] = useState<'form' | 'thankyou' | null>(null);
	const [colorTheme, setColorTheme] = useState(() => CELEBRATION_COLORS[Math.floor(Math.random() * CELEBRATION_COLORS.length)]);
	const { generateText, parseRSVP, moderateText } = useOpenAI();

	useEffect(() => {
		setColorTheme(prev => {
			if (CELEBRATION_COLORS.length === 1) return CELEBRATION_COLORS[0];
			let next = prev;
			while (next === prev) {
				next = CELEBRATION_COLORS[Math.floor(Math.random() * CELEBRATION_COLORS.length)];
			}
			return next;
		});
	}, [stage]);

	useEffect(() => {
		document.documentElement.classList.add('transitions-enabled');
		document.documentElement.style.transition = 'background-color 0.75s ease-in-out';
		document.documentElement.style.backgroundColor = colorTheme.bg;
		document.documentElement.style.color = colorTheme.flower;
		document.documentElement.style.setProperty('--wedding-flower', colorTheme.flower);
		document.documentElement.style.setProperty('--wedding-foreground', colorTheme.bg);
		return () => {
			document.documentElement.style.backgroundColor = '';
			document.documentElement.style.removeProperty('--wedding-flower');
			document.documentElement.style.removeProperty('--wedding-foreground');
		};
	}, [colorTheme]);

	const encode = (data: Record<string, string | number>) => {
		return Object.keys(data)
			.map(key => encodeURIComponent(key) + "=" + encodeURIComponent(data[key]))
			.join("&");
	};

	const handleTextSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!inputText.trim()) return;
		
		setStage('parsing');
		setIsEditing(false);
		
		const cleanInput = await cleanSafeInput(inputText);
		if (!cleanInput) {
			setStage(originalText ? 'review' : 'input');
			return;
		}

		const isUpdate = !!originalText;
		if (!originalText) {
			setOriginalText(cleanInput);
		}

		try {
			const parseInput = isUpdate
				? `The user asked to update their information. Original submission: "${originalText}". Updated submission: "${cleanInput}"`
				: cleanInput;

			await parseRSVP({
				input: parseInput,
				onParsed: (data) => {
					if (data.names.includes('ERROR')) {
						setMessage('ERROR: ' + data.details + '\nIf you are having issues, please contact Adam or Shannon.');
						setParsedData({ names: ['ERROR'], contact: '', contactType: 'email', guestCount: 0 });
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
					contact: parsedData.contact || '',
					contactType: parsedData.contactType || '',
					guests: parsedData.guestCount,
					details: parsedData.details || '',
					originalText: originalText
				})
			});

			await generateText({
				setText: setMessage,
				scrollRef: undefined,
				onDone: () => setStage('complete'),
				instructions: `Write a message thanking ${parsedData.names.join(' and ')} for RSVPing to Shannon and Adam's wedding on October 24th. They registered ${parsedData.guestCount} guest${parsedData.guestCount > 1 ? 's' : ''}. Keep it under 40 words. Try to make it a bit funny and sarcastic somehow. Refer to the registrants by their first names only. No emojis. (The original submission from the user was: "${originalText}")`
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
		setStage('intro');
		setMessage('');
		setParsedData(null);
		setIsEditing(false);
		setGiftStage(null);
	};

	const handleGiftClick = (amount?: number) => {
		const baseUrl = 'https://www.paypal.com/donate/?business=HH9JUSAVDGCCC&no_recurring=1&item_name=Shannon+%26+Adam%27s+Irish+Honeymoon&currency_code=USD';
		const url = amount ? `${baseUrl}&amount=${amount}` : baseUrl;
		window.open(url, '_blank', 'noopener,noreferrer');
		setGiftStage('thankyou');
	};

	return (
		<div className="wedding-wrapper">
			<div className="wedding-header">
				{stage === 'intro' && (
					<div className="intro-stage fade-in">
						<div className="flower-hero" aria-hidden="true" />
						<span className="event-title">The Wedding of</span>
					</div>
				)}
				{stage !== 'intro' && (
					<div className="intro-stage fade-in">
						<div className="flower-small" aria-hidden="true" />
					</div>
				)}

				
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

			{stage === 'intro' && !giftStage && (
				<div className="intro-stage fade-in">
					<div className="cta-row">
						<button className="confirm-button" onClick={() => setStage('input')}>
							RSVP
						</button>
						<button className="edit-button" type="button" onClick={() => { setGiftStage('form'); setStage('gift'); }}>
							Give a gift
						</button>
					</div>
				</div>
			)}

			{stage === 'gift' && giftStage === 'form' && (
				<div className="intro-stage fade-in">
					<div className="form-container fade-in">
						<p className="gift-description">In lieu of gifts, please donate to our honeymoon trip to Ireland! Shannon wants to ride a horse through the boglands.</p>
						<div className="gift-buttons">
							<button className="gift-button" onClick={() => handleGiftClick(25)}>
								$25
							</button>
							<button className="gift-button" onClick={() => handleGiftClick(50)}>
								$50
							</button>
							<button className="gift-button" onClick={() => handleGiftClick(100)}>
								$100
							</button>
							<button className="gift-button gift-button--other" onClick={() => handleGiftClick()}>
								Other
							</button>
						</div>
					</div>
				</div>
			)}

			{stage === 'gift' && giftStage === 'thankyou' && (
				<div className="intro-stage fade-in">
					<div className="form-container fade-in">
						<p className="thank-you-message">Thank you for your gift!</p>
						<button className="confirm-button" onClick={handleReset}>
							Finish
						</button>
					</div>
				</div>
			)}

			{stage === 'input' && (
				<form onSubmit={handleTextSubmit} className="text-input-form fade-in form-container">
					<label htmlFor="rsvpText">Let us know who's coming</label>
					<span className="subtext">Include names, contact, and the number of guests, as well as any other details you'd like to share.</span>
					<textarea
						name="rsvpText"
						placeholder="e.g. Shannon and Adam will be there, along with 2 guests! Contact me at name@example.com."
						value={inputText}
						autoComplete='off'
						onChange={(e) => setInputText(e.target.value)}
						className="text-input"
						rows={4}
						maxLength={1000}
						required
						disabled={isRejected}
					/>
					<div className="cta-row" style={{ justifyContent: 'end' }}>
					<button className="edit-button" type="button" onClick={handleReset}>Back</button>
					<button type="submit" className="confirm-button" disabled={isRejected}>Continue</button>
					</div>
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

					<div className="form-container details-card slide-up">
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
							<div className="cta-row" style={{ justifyContent: 'end' }}>
								<button className="edit-button" type="button" onClick={() => setIsEditing(false)}>Cancel</button>
								<button type="submit" className="confirm-button">Update</button>
							</div>
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

			{stage === 'complete' && parsedData && !giftStage && (
				<div className="success-container fade-in">
					<div className="form-container ai-message">{message}</div>

					<div className="form-container details-card slide-up">
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

					<div className="cta-row">
						<button className="confirm-button" type="button" onClick={() => setGiftStage('form')}>
							Give a gift
						</button>
						<button onClick={handleReset} className="edit-button fade-in-delay">
							Finish
						</button>
					</div>
				</div>
			)}

			{stage === 'complete' && giftStage === 'form' && (
				<div className="success-container fade-in">
					<div className="form-container fade-in">
						<p className="gift-description">In lieu of gifts, please donate to our honeymoon trip to Ireland! Shannon wants to ride a horse through the boglands</p>
						<div className="gift-buttons">
							<button className="gift-button" onClick={() => handleGiftClick(25)}>
								$25
							</button>
							<button className="gift-button" onClick={() => handleGiftClick(50)}>
								$50
							</button>
							<button className="gift-button" onClick={() => handleGiftClick(100)}>
								$100
							</button>
							<button className="gift-button gift-button--other" onClick={() => handleGiftClick()}>
								Other
							</button>
						</div>
					</div>
				</div>
			)}

			{stage === 'complete' && giftStage === 'thankyou' && (
				<div className="success-container fade-in">
					<div className="form-container fade-in">
						<p className="thank-you-message">Thank you!</p>
						<button className="confirm-button" onClick={handleReset}>
							Finish
						</button>
					</div>
				</div>
			)}
		</div>
	);
};

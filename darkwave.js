
//  Copyright © 2020, Stewart Smith. See LICENSE for details.






//  Keep in my this is *early days* / far from cleaned up.
//  There will be a lot of untidy code ahead;
//  things that are out of place / ought to be combined, etc.

const Darkwave = {

	REVISION: 5
}

const 
bufferLength = 4096,
buf = new Float32Array( bufferLength ),
fftLength = 2048,
streamData = new Uint8Array( fftLength )


let
audioContext,
analyser,
mediaStreamSource,
scopeCanvas,
scopeContext,
verbosity = 0,
hasBooted = false




//  Damn you, iOS Safari. Damn you to Hell.
//  This absolutely lowers the quality of the analysis.

const AudioContext = window.AudioContext || window.webkitAudioContext
if( 
	typeof window.AnalyserNode === 'function' && 
	typeof window.AnalyserNode.prototype.getFloatTimeDomainData !== 'function' ){
  
	const uint8 = new Uint8Array( bufferLength )
	window.AnalyserNode.prototype.getFloatTimeDomainData = function( array ){
		
		this.getByteTimeDomainData( uint8 )		
		for( let i = 0, length = array.length; i < length; i ++ ){
		
			array[ i ] = ( uint8[ i ] - 128 ) * 0.0078125
		}
	}
}




//  We cannot do any audio magic until a user interaction triggers it.
//  Why? It’s a browser security feature.
//  So we’ll call this on 'mousedown' or 'touchstart'.

function boot( event ){


	//  Ensure that we can only boot once.

	if( hasBooted ) return false
	hasBooted = true


	scopeCanvas  = document.getElementById( 'scope' )
	scopeContext = scopeCanvas.getContext( '2d' )


	//  Create a single audio context
	//  that we will share across everything.

	audioContext = new AudioContext()
	if( verbosity >= 0.5 ) console.log( 'audioContext.sampleRate', audioContext.sampleRate )


	//  Create the analyser that we’ll use
	//  to detect pitch, volume, etc.

	analyser = audioContext.createAnalyser()
	analyser.fftLength = fftLength
	// analyser.connect( audioContext.destination )
	

	//  Request access to the user’s audio input,
	//  which will kick off the fun.

	getMedia()


	//  In the (likely) event this was triggered by a user interaction
	//  then let’s stop the interaction bubbling right here.

	if( event ){

		event.stopPropagation()
		event.preventDefault()
	}
}
window.addEventListener( 'touchstart', boot )
window.addEventListener( 'mousedown', boot )




async function getMedia(){

	const constraints = {

		audio: true,
		video: false
	}
	let stream = null
	try {
	
		stream = await navigator.mediaDevices.getUserMedia( constraints )
		console.log( '👍 Yay! Stream acquisition succeeded.' )

		mediaStreamSource = audioContext.createMediaStreamSource( stream )
		mediaStreamSource.connect( analyser )


		//  Spin up some oscillators to play sound with. 
		//  These will be piped to the audioContext destination.

		parseUrlForVoices()
		updateUrlFromVoices()


		//  Kick it off.

		loop()
	}
	catch( error ){
	
		console.log( '👎 Yikes. Stream acquisition failed.', error )
	}
}








//  Sadly this is culturally limited to Western music,
//  and even further limited by insisting 440Hz is A♮.
//  https://en.wikipedia.org/wiki/A440_(pitch_standard)
//  See also my own work on Beep.js,
//  https://github.com/stewdio/beep.js,
//  and specifically the function Beep.Note.validateWestern().

const noteNames = 'C C# D D# E F F# G G# A A# B'.split(' ')
function getNoteNumberFromFrequencyHz( frequencyHz ){
	
	const noteNumber = 12 * ( Math.log( frequencyHz / 440 ) / Math.log( 2 ))
	return Math.round( noteNumber ) + 69
}
function getFrequencyHzFromNoteNumber( noteNumber ){

	return 440 * Math.pow( 2, ( noteNumber - 69 ) / 12 )
}
function getDetuneCents( frequencyHz, noteNumber ){

	return Math.floor( 

		1200 * Math.log( frequencyHz / getFrequencyHzFromNoteNumber( noteNumber )) / Math.log( 2 )
	) 
}






    //////////////////
   //              //
  //   Analysis   //
 //              //
//////////////////


const
MIN_SAMPLES = 4,
GOOD_ENOUGH_CORRELATION = 0.9

function autoCorrelate( buf, sampleRate ){
	
	const
	SIZE = buf.length,
	MAX_SAMPLES = Math.floor( SIZE / 2 ),
	correlations = new Array( MAX_SAMPLES )

	let
	offsetBest = -1,
	correlationBest = 0,
	correlationPrevious = 1,
	rms = 0,
	foundGoodCorrelation = false


	//  Do we have enough signal to work with?
	//  If not, then bail.

	for( let i = 0; i < SIZE; i ++ ){
		
		const val = buf[ i ]
		rms += val * val
	}
	rms = Math.sqrt( rms / SIZE )	
	if( rms < 0.01 ) return {

		rootMeanSquare: rms,
		confidence: 0
	}


	//  x

	for( let offset = MIN_SAMPLES; offset < MAX_SAMPLES; offset ++ ){
		
		let correlation = 0
		for( let  i = 0; i < MAX_SAMPLES; i ++ ){
			
			correlation += Math.abs(( buf[ i ]) - ( buf[ i + offset ]))
		}
		correlation = 1 - correlation / MAX_SAMPLES
		correlations[ offset ] = correlation
		if( correlation > GOOD_ENOUGH_CORRELATION && 
			correlation > correlationPrevious ){
			
			foundGoodCorrelation = true
			if( correlation > correlationBest ){
			
				correlationBest = correlation
				offsetBest = offset
			}
		} 
		else if( foundGoodCorrelation ){


			//  If we did NOT find a better correlation just now,
			//  but our “foundGoodCorrelation” flag is still true from our last loop
			//  we’re about to clobber our data with more worse correlations.
			
			//  Instead, let’s interpolate between the values 
			//  just before and just after the best offset index
			//  and use this to shift our projected frequency.

			//  This idea comes from cwilso’s old pitch detect algo.

			const shift = ( correlations[ offsetBest + 1 ] - correlations[ offsetBest - 1 ])
				/ correlations[ offsetBest ]
			return {

				frequencyHz:    sampleRate / ( offsetBest + ( 8 * shift )),
				rootMeanSquare: rms,
				confidence:     correlationBest
			}
		}
		correlationPrevious = correlation
	}
	

	//  This could be good. Get excited.

	if( correlationBest >= 0.5 ){
				
		return {
	
			frequencyHz:    sampleRate / offsetBest,
			rootMeanSquare: rms,
			confidence:     correlationBest
		}
	}
	

	//  Things did not go well if we’ve reached here.

	return {

		rootMeanSquare,
		confidence
	}
}






function loop(){
	
	analyser.getFloatTimeDomainData( buf )
	const ac = autoCorrelate( buf, audioContext.sampleRate )
	let volume = 0

	if( ac.confidence > 0.5 && 
		typeof ac.frequencyHz === 'number' ){

		const 
		frequencyHz = ac.frequencyHz
		noteNumber  = getNoteNumberFromFrequencyHz( frequencyHz ),
		noteName    = noteNames[ noteNumber % 12 ]
		detuneCents = getDetuneCents( frequencyHz, noteNumber )
		
		if( verbosity >= 0.5 ) console.log( 
		
			'\n\n  frequencyHz:', frequencyHz,
			'\n  noteNumber:', noteNumber,
			'\n  noteName:', noteName,
			'\n  detuneCents', detuneCents
		)

		if( detuneCents < 0 ){

			//  It’s a bit flat.
		}
		else if( detuneCents > 0 ){

			//  It’s a bit sharp.
		}
		else {

			//  This porridge is just right.
		}


		//  Volume.
		//  NOTE: Should we abandon this routine
		//  in favor of Root Mean Square (RMS) instead?

		analyser.getByteFrequencyData( streamData )
		let total = 0
		let average = 0
		for( let i = 0; i < streamData.length; i ++ )
			total += streamData[ i ]
		average = total / streamData.length

		volume = average / 20//( total / 40000 )
		if( verbosity >= 0.5 ) console.log( 'volume', volume )
		

		//  Update our Oscillators pitches
		//  and all the Gain Node volumes.

		Voice.all.forEach( function( voice ){

			voice.setFrequencyInput( frequencyHz )
			voice.setVolumeInput( volume )
		})
	}


	//  We’ve not received something worth working with
	//  so we’ll mute all voices for now.

 	else {

		Voice.all.forEach( function( voice ){

			voice.setVolumeInput( 0 )
		})
 	} 


	//  Draw our waveform on the scope.

	const heightHalf = scopeCanvas.height / 2
	scopeContext.clearRect( 0, 0, scopeCanvas.width, scopeCanvas.height )
	scopeContext.strokeStyle = `hsla( 160, 90%, 80%, 0.2 )`
	scopeContext.lineWidth = 2
	scopeContext.strokeStyle = `rgba( 255, 255, 255, ${ 0.2 + 0.8 * ac.confidence } )`
	scopeContext.beginPath()
	scopeContext.moveTo( 
		
		0, 
		heightHalf + buf[ 0 ] * heightHalf
	)
	for( let i = 1; i < 512; i ++ ){//  Later try i < bufferLength and track performance.
		
		scopeContext.lineTo( 

			i, 
			heightHalf + buf[ i ] * heightHalf
		)
	}
	scopeContext.stroke()
	

 	//  Update our display numbers.

	Object.keys( ac )
	.forEach( function( key ){

		let value = ac[ key ]
		value = Math.round( value * 100 ) / 100
		document.getElementById( key )
		.innerText = value.toLocaleString()
	})
	document.getElementById( 'volume' ).innerText = Math.round( volume * 100 ) / 100


	//  Might as well do this again.

	requestAnimationFrame( loop )
}








    ///////////////
   //           //
  //   Voice   //
 //           //
///////////////


//  Borrowed and updated from my own Beep.js project.

function Voice( waveType, frequencyFactor, volumeFactor ){

	const voice = this


	//  Create a Gain Node
	//  for turning this voice up and down.

	this.gainNode = audioContext.createGain()
	this.gainNode.gain.value = 0
	this.gainNode.connect( audioContext.destination )


	//  Create an Oscillator
	//  so this voice can generate sound.

	this.oscillator = audioContext.createOscillator()
	this.oscillator.connect( this.gainNode )
	this.oscillator.type = 'sine'
	this.oscillator.frequency.value = 440 / 2


	//  Our inputs will be sent from loop()
	//  based on what our analyzer detects.

	this.setFrequencyInput = function( input ){

		if( typeof input !== 'number' ) input = 220
		this.frequencyFundamental = input
		this.oscillator.frequency.value = input * this.frequencyFactor 
	}
	this.setVolumeInput = function( input ){

		if( typeof input !== 'number' ) input = 0.5
		this.volumeFundamental = input
		this.gainNode.gain.value = input * this.volumeFactor
	}
	

	//  x

	this.setWaveType = function( input ){

		if( typeof input !== 'string' ) input = 'square'
		input = input.toLowerCase()
		if([

			'sine',
			'square',
			'sawtooth',
			'triangle'

		].includes( input ) !== true ){

			input = 'square'
		}
		this.waveType = input
		this.oscillator.type = input

		//  INVESTIGATE THIS LATER!!!!!
		//  custom wave shapes!!!
		//  https://developer.mozilla.org/en-US/docs/Web/API/OscillatorNode/setPeriodicWave
	}
	this.setWaveType( waveType )
	

	this.setFrequencyFactor = function( input ){

		input = parseFloat( input )
		if( typeof input !== 'number' || isNaN( input )) input = 1
		if( input <  0 ) input =  0
		if( input > 20 ) input = 20
		this.frequencyFactor = input
		this.setFrequencyInput( this.frequencyFundamental )
	}
	this.frequencyFundamental = 220
	this.setFrequencyFactor( frequencyFactor )
	

	this.setVolumeFactor = function( input ){

		input = parseFloat( input )
		if( typeof input !== 'number' || isNaN( input )) input = 1
		if( input <  0 ) input =  0
		if( input > 10 ) input = 10
		this.volumeFactor = input
		this.setVolumeInput( this.volumeFundamental )
	}
	this.volumeFundamental = 0
	this.setVolumeFactor( volumeFactor )






	this.play  = function(){ this.oscillator.start( 0 )}
	this.pause = function(){ this.oscillator.stop( 0 )}



	const 
	template = document.getElementById( 'voice' ),
	clone = template.content.cloneNode( true )
	voicesTable = document.querySelector( '#voices table' )
	
	
	voicesTable.appendChild( clone )
	this.domElement = voicesTable.querySelector( 'tr.voice:last-child' )




	this.index = Voice.all.length
	this.domElement
	.querySelector( '.voice-index' )
	.innerText = this.index + 1


	const waveTypeInput = this.domElement
	.querySelector( '[name=waveType]' )
	waveTypeInput
	.querySelector( '[value='+ this.waveType +']' )
	.setAttribute( 'selected', true )
	waveTypeInput.addEventListener( 'change', function( event ){

		voice.setWaveType( event.target.value )
		updateUrlFromVoices()
	})


	const frequencyInput = this.domElement
	.querySelector( '[name=frequency]' )
	frequencyInput.value = this.frequencyFactor
	frequencyInput.addEventListener( 'change', function(){

		voice.setFrequencyFactor( parseFloat( frequencyInput.value ))
		updateUrlFromVoices()
	})


	const volumeInput = this.domElement
	.querySelector( '[name=volume]' )
	volumeInput.value = this.volumeFactor
	volumeInput.addEventListener( 'change', function( event ){

		voice.setVolumeFactor( parseFloat( volumeInput.value ))
		updateUrlFromVoices()
	})




	const deleteButton = this.domElement
	.querySelector( '.voice-delete' )
	deleteButton.addEventListener( 'mousedown', function(){

		Voice.delete( voice.index )
		updateUrlFromVoices()
	})







	Voice.all.push( this )


	if( verbosity >= 0.2 ) console.log(

		'\n\n  Created new Voice.',
		'\n  Wave type:', this.waveType.toUpperCase(),
		'\n  Frequency factor:', this.frequencyFactor,
		'\n  Volume factor:', this.volumeFactor,
		'\n\n\n'
	)


	this.play()


	this.destroy = function(){

		voice.gainNode.disconnect()
		voice.domElement.parentNode.removeChild( voice.domElement )
	}
}
Voice.all = []
Voice.delete = function( index ){

	const voice = Voice.all[ index ]

	if( verbosity >= 0.2 ) console.log( 'Will remove voice #', index, voice )
	voice.destroy()
	Voice.all.splice( index, 1 )
	Voice.all.forEach( function( voice, i ){

		voice.index = i
		voice.domElement
		.querySelector( '.voice-index' )
		.innerText = ( i + 1 )
	})
	updateUrlFromVoices()
}








    /////////////////
   //             //
  //   Helpers   //
 //             //
/////////////////


function parseUrlForVoices(){

	let hash = document.location.hash
	if( hash.length === 0 ){

		//hash = '#square,1/2,0.8;triangle,3/4,0.2;sine,1/1,0.3'
		hash = '#square,0.5,0.8;triangle,0.75,0.2;sine,1,0.3'
	}

	hash
	.substr( 1 )
	.split( ';' )
	.forEach( function( params ){

		new Voice( ...params.split( ',' ))
	})
}
function updateUrlFromVoices(){

	history.replaceState({}, 

		'Darkwave.js', 
		Voice.all.reduce( function( hash, voice, i ){

			return (

				hash
				+ ( i > 0 ? ';' : '' )
				+ voice.waveType +','
				+ voice.frequencyFactor +','
				+ voice.volumeFactor
			)

		}, '#' )
	)
}


window.addEventListener( 'DOMContentLoaded', function(){

	document
	.getElementById( 'voice-add' )
	.addEventListener( 'mousedown', function(){ 

		new Voice()
		updateUrlFromVoices()
	})
})








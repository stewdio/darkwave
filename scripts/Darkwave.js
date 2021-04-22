
//  Copyright © 2020–2021, Stewart Smith. See LICENSE for details.




import Voice from './Voice.js'
import Bank  from './Bank.js'
import Param from './Param.js'




const 
REVISION = 6,
verbosity = 0.5,
banksTotal = 6,//1
params = []

let
hasBooted = false,
isListening = false,
isPlaying = false,
audioContext,
analyser,
bufferLength,
timeDomainData,
frequencyData,
banks = new Array( banksTotal ),
banksEl,
scopeCanvas,
scopeContext,
graphCanvas,
graphContext




window
.addEventListener( 

	'DOMContentLoaded', 
	 function(){

		document
		.body
		.addEventListener( 

			'mousedown', 
			 boot
		)
	}
)




function boot(){


	//  Ensure that we can only boot once.

	if( hasBooted ) return false
	hasBooted = true


	//  Setup out audio context, analyser,
	//  and data arrays for working magic.

	audioContext = new AudioContext()
	analyser = audioContext.createAnalyser()
	analyser.fftSize = 4096//2048
	bufferLength   = analyser.frequencyBinCount
	timeDomainData = new Uint8Array( bufferLength )
	frequencyData  = new Uint8Array( bufferLength )


	//  Just as a reality check, what’s our sample rate?

	if( verbosity >= 0.5 ){

		console.log( 

			'audioContext.sampleRate', 
			 audioContext.sampleRate
		)
	}


	//  Create our voice banks.

	banks = banks
	.fill( 0 )
	.map( function(){

		return new Bank( Param.all )
	})
	window.banks = banks


	//  Ready our output canvi!

	graphCanvas = document
		.getElementById( 'frequencies-graph' )
	graphContext = graphCanvas
		.getContext( '2d' )
	graphContext.lineWidth = 1

	banksEl = document.getElementById( 'banks' )
	banks
	.forEach( function( bank, i ){

		const el = document.createElement( 'div' )
		el.classList.add( 'bank' )
		el.style.top  = ( i + 1 ) / banks.length * 24 +'vw'
		el.style.left = '50%'
		banksEl.appendChild( el )
		bank.domElement = el
	})


	function fixCanvasResolution(){

		graphCanvas.width = graphCanvas.clientWidth * devicePixelRatio
		graphCanvas.width = graphCanvas.clientHeight * devicePixelRatio
	}
	fixCanvasResolution()
	window.addEventListener( 'resize', fixCanvasResolution )



	//  Hook up the microphone.

	getMedia()
}






function loop(){

	if( isListening ){

		analyser
		.getByteTimeDomainData( timeDomainData )
		
		analyser
		.getByteFrequencyData( frequencyData )


		const 
		sliceWidth = graphCanvas.width / bufferLength	


		const
		amplitudeMax = Array.from( timeDomainData )
		.sort( function( a, b ){

			return a - b
		
		})[ 0 ]


		//  Scope

		let x = 0
		graphContext.clearRect( 0, 0, graphCanvas.width, graphCanvas.height )
		const alpha = 0.1 + Math.min( Math.abs( amplitudeMax - 127 ) * 8 / 127, 0.9 )
		graphContext.strokeStyle = `hsla( 150, 25%, 90%, ${ alpha } )`
		graphContext.beginPath()
		for( let i = 0; i <= bufferLength; i ++ ){

			const
			v = timeDomainData[ i ] / 127,
			y = v * graphCanvas.height / 2
			// alpha = 0.1 + Math.min( Math.abs( timeDomainData[ i ] - 127 ) * 2 / 127, 0.9 )
			

			if( i === 0 ){
			
				graphContext.moveTo( x, y )
			}
			else {
			
				graphContext.lineTo( x, y )
			}
			x += sliceWidth
		}
		graphContext.lineTo( graphCanvas.width, graphCanvas.height / 2 )
		graphContext.stroke()




		//  Graph
		
		const 
		barWidth = graphCanvas.width / analyser.frequencyBinCount,
		barWidthCeil = Math.ceil( barWidth )

		let barHeight
		x = 0
		// graphContext.clearRect( 0, 0, graphCanvas.width, graphCanvas.height )
		for( let i = 0; i < analyser.frequencyBinCount; i ++ ){

			const norm = frequencyData[ i ] / 255
			barHeight = Math.max( graphCanvas.height * 0.1, graphCanvas.height * norm )

			/*
			const 
			hue = i / analyser.frequencyBinCount * 150,
			gradient = graphContext.createLinearGradient( 

				0, 
				graphCanvas.height - barHeight, 
				0, 
				graphCanvas.height
			)
			gradient.addColorStop( 0.0, `hsla( ${ hue }, 100%, 50%, 1 )` )
			gradient.addColorStop( 0.5, `hsla( ${ hue },  90%, 50%, 1 )` )
			gradient.addColorStop( 1.0, `hsla( ${ hue },  90%, 50%, 0 )` )
			graphContext.fillStyle = gradient
			graphContext.fillRect(
				
				x,
				graphCanvas.height - barHeight,
				barWidthCeil,//barWidth,
				barHeight
			)
			*/


			const xFloor = Math.floor( x )


			graphContext.fillStyle = 'hsl( '+ ( i / analyser.frequencyBinCount * 150 ) +', 100%, 50% )'
			graphContext.fillRect(
				
				xFloor,
				graphCanvas.height - barHeight,
				barWidthCeil,//barWidth,
				barHeight
			)




			x += barWidth
		}




		if( isPlaying ){

			//  x

			const processed = frequencyData
			.reduce( function( temp, v, i ){

				temp.push([ v, i ])
				return temp

			}, [] )


			//  Whittle this list down to only 
			//  the top 6 most present frequencies.
			//  First we must sort by amplitude descending,
			//  then cull everything but the top few.

			.sort( function( a, b ){

				return b[ 0 ] - a[ 0 ]
			})
			.filter( function( item, i ){

				return i < banksTotal
			})

			
			//  Return a list of those FFT slices,
			//  each slice consisting of
			//  frequency and amplitude (volume).

			.reduce( function( temp, item ){

				temp.push([

					item[ 0 ],
					item[ 1 ] * audioContext.sampleRate / bufferLength
				])
				return temp

			}, [] )


			//  Get usable data for each of the above FFT slices.

			.map( function( item, i ){

				const data = dataFromFrequency( item[ 1 ])
				// data.volume = ( item[ 0 ] - 128 ) / 128
				data.volume = item[ 0 ] / 255
				return data
			})


			.forEach( function( item, i ){

				const isGood =

						item.volume > 0.4 &&
						isFinite( item.noteNumber ) &&
						item.frequency > 0
					? true
					: false
				

				// console.log( 
			
				// 	'\n\n  isGood:', isGood,
				// 	'\n  frequency:', item.frequency,
				// 	'\n  noteNumber:', item.noteNumber,
				// 	'\n  noteName:', item.noteName,
				// 	'\n  detuneCents', item.detuneCents,
				// 	'\n  volume:', item.volume
				// )


				if( isGood ){

					banks[ i ].isActive = true
					banks[ i ].setVolume( item.volume )
					banks[ i ].setFrequency( item.frequency )	
				}
				else {

					banks[ i ].isActive = false
					banks[ i ].setVolume( 0 )
				}
			})
		}


		// console.log( 'processed', processed )
		// console.log( '\n\n\n----------------------\n\n\n')


		banks
		.forEach( function( bank, i ){

			bank.domElement.classList[

				bank.isActive
				? 'add'
				: 'remove'

			]( 'active' )
			bank.domElement.style.left = ( bank.frequency / audioContext.sampleRate * 100 ) +'%'
			bank.domElement.innerHTML = //'<b>' + String.fromCharCode( 90 - i ) + '</b>'+ 
				( Math.round( bank.frequency * 100 ) / 100 ).toLocaleString()
		})

	}//  isListening







	requestAnimationFrame( loop )
}




function listen(){

	boot()
	isListening = true
}
function stopListening(){

	isListening = false
}
function play(){

	boot()
	isPlaying = true
}
function pause(){

	isPlaying = false
	Bank.all
	.forEach( function( bank ){

		bank.isActive = false
		bank.setVolume( 0 )	
	})
}








function peakClassifier( frames, peakThreshold ){

	const kernelWidth = 2//  Try 4, 6, 8, for different peakiness sensitivity.
	for( let i = 0; i < frames.length; i ++ ){

		const fft = frames[ i ].getFFT()// ?????????
		for( 

			let bin = kernelWidth;
			bin < fft.length - kernelWidth; 
			bin ++ ){

			const
			kernelAvgL = 0,
			kernelAvgR = 0,
			kernelSum  = 0

			for( let k = 1; k < kernelWidth; k ++ ){
			
				kernelAvgL += fft[ bin ].amp - specs[ bin - k ].amp//  Look at lower Hz.
				kernelAvgR += fft[ bin ].amp - specs[ bin + k ].amp//  Look at higher Hz.
			}
			kernelAvgL /= k
			kernelAvgR /= k
			kernelSum   = (( kernelMaxL + kernelMaxR ) * 0.5 ) / fft[ bin ].amp

			if( kernelSum >= peakThreshold ) fft[ bin ].peak = true
		}//  for bin.
	}//  for i.
}
function peakClassifierMax( frms, peakThresh ){

	const kernelWidth = 2//  Try 4, 6, 8, for different peakiness sensitivity.
	for( let t = 0; t < frms.length; t ++ ){

		const fft = frms[ t ].getFFT()
		for( 
			
			let bin = kernelWidth; 
			bin < fft.length - kernelWidth;
			bin ++ ){

			const
			kernelMaxL = -1000,//  init arbitrarily min number.
			kernelMaxR = -1000,//  init arbitrarily min number.
			kernelSum  =     0

			for( let k = 1; k < kernelWidth; k ++ ){
				
				kernelMaxL = max( kernelMaxL, fft[ bin ].amp - specs[ bin - k ].amp )//  Look at lower Hz.
				kernelMaxR = max( kernelMaxR, fft[ bin ].amp - specs[ bin + k ].amp )//  Look at higher Hz.
			}
			kernelSum = (( kernelMaxL + kernelMaxR ) * 0.5 ) / fft[ bin ].amp
			if( kernelSum >= peakThresh ) fft[ bin ].peak = true

		}//  for bin.
	}//  for t.
}










function dataFromFrequency( frequency ){

	const 	
	noteNumber  = getNoteNumberFromFrequencyHz( frequency ),
	noteName    = noteNames[ noteNumber % 12 ],
	detuneCents = getDetuneCents( frequency, noteNumber )
		
	return {

		frequency,
		noteNumber,
		noteName,
		detuneCents
	}
}







let mediaStreamSource

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
		isListening = true
		isPlaying = true
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






function inspect(){

	console.log( 'Param.all', Param.all )
	console.log( 'Bank.all', Bank.all )
	console.log( 'Voice.all', Voice.all )
}



window.D = {

	REVISION,
	boot,
	play,
	pause,
	listen,
	stopListening,
	getAudioContext: function(){

		return audioContext
	},
	inspect,

	peakClassifier,
	peakClassifierMax
}




export default {

	REVISION,
	boot,
	getAudioContext: function(){

		return audioContext
	},
	inspect
}
























































































































































































































console.log( `


████    ███   ████   █   █  █   █   ███   █   █  █████
█   █  █   █  █   █  █  █   █   █  █   █  █   █  █
█   █  █████  ████   ███    █ █ █  █████  █   █  ████
█   █  █   █  █   █  █  █   ██ ██  █   █   █ █   █
████   █   █  █   █  █   █  █   █  █   █    █    █████

Revision ${ REVISION }



` )
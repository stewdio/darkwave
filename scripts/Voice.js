
//  Copyright © 2020–2021, Stewart Smith. See LICENSE for details.




import D from './Darkwave.js'




function Voice( waveType, frequency, volume ){

	const
	audioContext = D.getAudioContext()


	//  Create a Gain Node
	//  for turning this voice’s volume up and down.

	this.gainNode = audioContext.createGain()
	this.gainNode.gain.value = 0
	this.gainNode.connect( audioContext.destination )


	//  Create an Oscillator
	//  so this voice can generate tones.

	this.oscillator = audioContext.createOscillator()
	this.oscillator.connect( this.gainNode )
	

	//  Set relevant params.

	this.setWaveType( waveType )
	this.setFrequency( frequency )
	this.setVolume( volume )

	this.play()
}
Voice.destroy = function( voice ){

	voice.destroy()
}




Object.assign( Voice.prototype, {

	setWaveType: function( input ){

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
		this.oscillator.type = input

		//  INVESTIGATE THIS LATER!!!!!
		//  custom wave shapes!!!
		//  https://developer.mozilla.org/en-US/docs/Web/API/OscillatorNode/setPeriodicWave
	},
	setFrequency: function( input ){

		this
		.oscillator
		.frequency
		.value = 
		typeof input === 'number'
		? input
		: 220
	},
	setVolume: function( input ){

		this
		.gainNode
		.gain
		.value = 
		typeof input === 'number'
		? input
		: 0.1
	},
	play: function(){ 

		this.oscillator.start( 0 )
	},
	pause: function(){

		this.oscillator.stop( 0 )
	},
	destroy: function(){

		this.pause()
		this.oscillator.disconnect()
		this.gainNode.disconnect()
		this.oscillator = null
		this.gainNode = null
	}
})




export default Voice








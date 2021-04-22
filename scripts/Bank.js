
//  Copyright © 2020–2021, Stewart Smith. See LICENSE for details.




import Voice from './Voice.js'


/*


6 banks
3 voices per bank


Bank has 
	voices []
	frequency #
	frequencyFactors []
	volume #
	volumeFactors []

Voice has
	oscillator node {} w frequency #
	gain node {} w volume #
	wave type $


*/




function Bank( params ){
	
	Object.assign( this, {

		isActive: false,
		frequency: 220,
		volume: 0
	})
	this.voices = []
	this.setVoices( params )
	Bank.all.push( this )
}
Object.assign( Bank, {

	all: []
})
;[
	'addVoice',
	'removeVoice',
	'setVoices'

].forEach( function( name ){

	Bank.all[ name ] = function( input ){

		this
		.forEach( function( bank ){

			bank[ name ]( input )
		})
	}
})




;[
	'WaveType',
	'FrequencyFactor',
	'VolumeFactor'

].forEach( function( nameShort ){

	nameShort = 'set' + nameShort
	const nameFull = nameShort +'ForVoice'
	Bank.all[ nameFull ] = function( index, input ){

		this
		.forEach( function( bank ){

			// console.log( 'about to call meta function...', bank, nameFull )
			bank[ nameShort ]( index, input )
		})
	}
	// Bank.prototype[ nameShort ] = function( index, input ){

	// 	this
	// 	.voices
	// 	[ nameShort ]
	// 	( input )
	// }
})




//   Bank.all.setWaveTypeForVoice( this.index, waveType )







Object.assign( Bank.prototype, {

	addVoice: function( param ){

		this.voices
		.push(

			new Voice( param.waveType )
		)
		this.frequencyFactors
		.push(

			param.frequencyFactor
		)
		this.volumeFactors
		.push(

			param.volumeFactor
		)
		this.setFrequency( this.frequency )
		this.setVolume( this.volume )
	},
	removeVoice: function( index ){

		this.voices[ index ].destroy()
		this.voices.splice( index, 1 )
		this.frequencyFactors.splice( index, 1 )
		this.volumeFactors.splice( index, 1 )
	},
	setVoices: function( params ){


		//  Destroy this bank’s voices.

		this.voices
		.forEach( Voice.destroy )


		//  Reset this bank’s arrays.

		Object.assign( this, {

			voices: [],
			frequencyFactors: [],
			volumeFactors: []
		})


		//  Rebuild this bank’s arrays.

		const that = this
		if( params instanceof Array ){
			params
			.forEach( function( param ){

				that.voices
				.push(

					new Voice( param.waveType )
				)
				that.frequencyFactors
				.push(

					param.frequencyFactor
				)
				that.volumeFactors
				.push(

					param.volumeFactor
				)
			})
		}


		//  Set each voice’s frequency and volume.

		this.setFrequency( this.frequency )
		this.setVolume( this.volume )
	},
	setFrequency: function( input ){

		input = parseFloat( input )
		if( typeof input !== 'number' || isNaN( input )) input = 220

		const that = this
		this.frequency = input
		this.voices
		.forEach( function( voice, i ){

			voice.setFrequency(

				that.frequency * that.frequencyFactors[ i ]
			)
		})
	},
	setVolume: function( input ){

		input = parseFloat( input )
		if( typeof input !== 'number' || isNaN( input )) input = 0.5
		if( input < 0 ) input = 0
		if( input > 2 ) input = 2

		const that = this
		this.volume = input
		this.voices
		.forEach( function( voice, i ){

			voice.setVolume(

				that.volume * that.volumeFactors[ i ]
			)
		})
	},

	setWaveType: function( index, input ){

		this.voices[ index ].setWaveType( input )
	},
	setFrequencyFactor: function( index, input ){

		this.frequencyFactors[ index ] = input
	},
	setVolumeFactor: function( index, input ){


		this.volumeFactors[ index ] = input
	}
})




export default Bank








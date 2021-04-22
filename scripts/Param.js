
//  Copyright © 2020–2021, Stewart Smith. See LICENSE for details.


/*


	You might imagine a “Param” as an archetypal Voice.
	To the graphic interface user they indeed feel the same.
	But under the hood each Bank drives its own set of 
	unique Voices. So a Param represents a single Voice
	from EACH Bank. For example, Param #2 is driving each
	Bank’s Voice #2. In this way a single Param drives as
	many Voices as there are Banks.


*/




import Bank from './Bank.js'




function Param( waveType, frequencyFactor, volumeFactor ){


	//  Keep a refence to the local “this”,
	//  mark this instance’s index #,
	//  and store this param in an array
	//  with its siblings.

	const param = this
	this.index = Param.all.length
	Param.all.push( this )


	//  Begin build-out of the user interface.

	const 
	template = document.getElementById( 'param' ),
	clone = template.content.cloneNode( true ),
	paramsTable = document.querySelector( '#params table' )
	
	paramsTable.appendChild( clone )
	this.domElement = paramsTable
	.querySelector( 'tr.param:last-child' )

	this.domElement
	.querySelector( '.param-index' )
	.innerText = this.index + 1




	this.setWaveType( waveType, true )
	this.setFrequencyFactor( frequencyFactor, true )
	this.setVolumeFactor( volumeFactor, true )


	//  Add on-change event listeners
	//  for changes to this param’s
	//  waveType, frequencyFactor, volumeFactor.

	;[

		'waveType',
		'frequencyFactor',
		'volumeFactor'
	
	].forEach( function( name ){

		param
		.domElement
		.querySelector( `[name=${ name }]` )
		.addEventListener( 'change', function( event ){

			param[ 'set' + name[ 0 ].toUpperCase()
			+ name.substr( 1 )]( event.target.value )
		})
	})


	//  Enable the “Remove” button
	//  for this param.

	this.domElement
	.querySelector( '.param-remove' )
	.addEventListener( 'mousedown', function(){

		Param.remove( param )
	})




	Bank.all.addVoice( this )
}




Object.assign( Param, {

	all: [],
	remove: function( param ){

		const index = this.all.indexOf( param )
		param.domElement.remove()
		Param.all.splice( index, 1 )
		Param.all.forEach( function( param, i ){

			param.index = i
			param.domElement
			.querySelector( '.param-index' )
			.innerText = ( i + 1 )
		})
		Bank.all.removeVoice( index )
		this.updateUrlFromParams()
	},
	updateUrlFromParams: function(){

		history.replaceState({}, 

			'Darkwave.js', 
			Param.all
			.reduce( function( hash, param, i ){

				return (

					hash
					+ ( i > 0 ? ';' : '' )
					+ param.waveType +','
					+ param.frequencyFactor +','
					+ param.volumeFactor
				)

			}, '#' )
		)
	},
	parseUrlForParams: function(){

		let hash = document.location.hash
		if( hash.length === 0 ){

			//hash = '#square,1/2,0.8;triangle,3/4,0.2;sine,1/1,0.3'
			hash = '#square,0.5,0.3;triangle,0.75,0.2;sine,1,0.1'
		}

		hash
		.substr( 1 )
		.split( ';' )
		.forEach( function( args ){

			new Param( ...args.split( ',' ))
		})
	}
})




Object.assign( Param.prototype, {

	setWaveType: function( waveType, skipUpdate ){
		
		if([

			'sine',
			'square',
			'sawtooth',
			'triangle'

		].includes( waveType ) !== true ){

			waveType = 'square'
		}

		this.waveType = waveType
		this
		.domElement
		.querySelector( `

			select[name='waveType']
			option[value='${ waveType }']

		` )
		.setAttribute( 'selected', true )
		if( skipUpdate !== true ){

			Bank.all.setWaveTypeForVoice( this.index, waveType )
			Param.updateUrlFromParams()
		}
	},
	setFrequencyFactor: function( frequencyFactor, skipUpdate ){

		frequencyFactor = parseFloat( frequencyFactor )
		if( typeof frequencyFactor !== 'number' 
			|| isNaN( frequencyFactor )) frequencyFactor = 1

		this.frequencyFactor = frequencyFactor
		this
		.domElement
		.querySelector( '[name=frequencyFactor]' )
		.value = parseFloat( frequencyFactor )
		if( skipUpdate !== true ){

			Bank.all.setFrequencyFactorForVoice( this.index, frequencyFactor )
			Param.updateUrlFromParams()
		}		
	},
	setVolumeFactor: function( volumeFactor, skipUpdate ){

		volumeFactor = parseFloat( volumeFactor )
		if( typeof volumeFactor !== 'number' 
			|| isNaN( volumeFactor )) volumeFactor = 0.1

		this.volumeFactor = volumeFactor
		this
		.domElement
		.querySelector( '[name=volumeFactor]' )
		.value = parseFloat( volumeFactor )
		if( skipUpdate !== true ){
		
			Bank.all.setVolumeFactorForVoice( this.index, volumeFactor )
			Param.updateUrlFromParams()
		}
	}
})




window.addEventListener( 'DOMContentLoaded', function(){

	Param.parseUrlForParams()

	document
	.getElementById( 'param-add' )
	.addEventListener( 'mousedown', function(){

		new Param()
	})
})




export default Param








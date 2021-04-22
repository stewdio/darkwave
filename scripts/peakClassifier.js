



// peakClassifier( frequencyData, 0.8 )
// peakClassifierMax( frequencyData, 0.8 )

bufferLength = analyser.frequencyBinCount




const 
peakClassifier = function( peakThreshold ){

	const 
	kernelWidth = 2,//  Try 4, 6, 8, for different peakiness sensitivity.
	peaks = []
	
	for(

		let i = kernelWidth;
		i < bufferLength - kernelWidth; 
		i ++ ){

		const 
		bin = frequencyData[ i ]

		let
		kernelAvgL = 0,
		kernelAvgR = 0

		for( let k = 1; k < kernelWidth; k ++ ){
		
			kernelAvgL += bin - frequencyData[ i - k ]//  Look at lower Hz.
			kernelAvgR += bin - frequencyData[ i + k ]//  Look at higher Hz.
		}
		kernelAvgL /= k
		kernelAvgR /= k
		
		const kernelSum = (( kernelMaxL + kernelMaxR ) * 0.5 ) / bin

		if( kernelSum >= peakThreshold ) peaks.push( i )
	}
	return peaks
},
peakClassifierMax = function( frames, peakThreshold ){

	const kernelWidth = 2//  Try 4, 6, 8, for different peakiness sensitivity.
	for( let t = 0; t < frames.length; t ++ ){

		const fft = frames[ t ]//.getFFT()
		for( 
			
			let bin = kernelWidth; 
			bin < fft.length - kernelWidth;
			bin ++ ){

			const
			kernelMaxL = -1000,//  init arbitrarily min number.
			kernelMaxR = -1000,//  init arbitrarily min number.
			kernelSum  =     0

			for( int k = 1; k < kernelWidth; k ++ ){
				
				kernelMaxL = max( kernelMaxL, bin - specs[ bin - k ].amp )//  Look at lower Hz.
				kernelMaxR = max( kernelMaxR, bin - specs[ bin + k ].amp )//  Look at higher Hz.
			}
			kernelSum = (( kernelMaxL + kernelMaxR ) * 0.5 ) / fft[ bin ].amp
			if( kernelSum >= peakThreshold ) fft[ bin ].peak = true

		}//  for bin.
	}//  for t.
}






/*
  void peakClassifier( Frame[] frms, float peakThresh ){
     
       int kernelWidth = 2; // try 4, 6, 8, for different peakiness sensitivity 
            
       for(int t = 0; t < frms.length; t++ ){
         
              FFT[] fft = frms[t].getFFT();
	                 
             for( int bin = kernelWidth; bin < fft.length-kernelWidth; bin++ ){
              
                 float kernelAvgL = 0;
                 float kernelAvgR = 0;
                 float kernelSum  = 0;
                
		 // kernel function with equal weights == average. 
                 for( int k = 1; k < kernelWidth; k++ ){
 		      kernelAvgL += fft[ bin ].amp - specs[ bin-k ].amp; // look backwards
 		      kernelAvgR += fft[ bin ].amp - specs[ bin+k ].amp; // look forwards
                 }     
		
 		kernelAvgL /= k; 
 		kernelAvgR /= k;
                 kernelSum  = ((kernelMaxL + kernelMaxR )*0.5) / fft[ bin ].amp;
		
		
                 if(kernelSum >= peakThresh){ fft[ bin ].peak = true;  }  
		   
             }//for bin
        }// for frames(t)          
 };
 */
 








/*
 
 void peakClassifierMax( Frame[] frms, float peakThresh ){
     
      int kernelWidth = 2; // try 4, 6, 8, for different peakiness sensitivity
            
      for(int t = 0; t < frms.length; t++ ){
         
             FFT[] fft = frms[t].getFFT();
	                 
            for( int bin = kernelWidth; bin < fft.length-kernelWidth; bin++ ){
              
                float kernelMaxL = -1000; // init arbitrarily min number
                float kernelMaxR = -1000; // init arbitrarily min number
                float kernelSum  = 0;
                
                for( int k = 1; k < kernelWidth; k++ ){
                      kernelMaxL = max( kernelMaxL, fft[ bin ].amp - specs[ bin-k ].amp ); // look backwards
                      kernelMaxR = max( kernelMaxR, fft[ bin ].amp - specs[ bin+k ].amp ); // look forwards
                }     
                 
                kernelSum = ((kernelMaxL + kernelMaxR )*0.5) / fft[ bin ].amp;
                if(kernelSum >= peakThresh){ fft[ bin ].peak = true;  }  
		   
            }//for bin
       }// for frames(t)          
};

*/

//  (*) "look backwards" and "look forwards" are *not* in time, but in FFT bin array space


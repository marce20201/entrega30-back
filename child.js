const getRandomNumbers = (cant) => {
    let numbers = [];
  
    for (let i=0; i<cant; i++){
        let rndmNo = Math.floor(Math.random() * (1000 - 1) + 1);
     
        const foundNumber = numbers.find(item => {
            return item.number === rndmNo;
        })

        const foundIndex = numbers.findIndex(item => {
            return item.number === rndmNo;
        })

        if(!foundNumber){
            numbers.push({number: rndmNo, cantidad: 1})
        } else {
            let cantidad = numbers[foundIndex].cantidad;
            numbers[foundIndex].cantidad = cantidad+1;
        }
    }

    return numbers;
}

process.on('message', req => {
    const {cant} = req;

    if(!cant) {
        let numerosRandom = getRandomNumbers(100000000);
        process.send(numerosRandom);
    }

    let numerosRandom = getRandomNumbers(cant);
    process.send(numerosRandom);
})
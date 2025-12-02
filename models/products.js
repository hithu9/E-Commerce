const mongoose=require('mongoose');
const productSchema=mongoose.Schema({
    name:String,
    description:String,
    price:Number,
    image:String,
    tags: [String]
});
module.exports=mongoose.model('Product',productSchema);
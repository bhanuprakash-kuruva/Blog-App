const {validateToken} = require('../services/authentication')
function checkAuthCookie(cookieName){
    return (req,res,next)=>{
           const  tokenCookie = req.cookies[cookieName]
           if(!tokenCookie){
            return next();
           }
        try{
            const userPayload = validateToken(tokenCookie);
            req.user=userPayload
            console.log(userPayload)
        }catch(err){
            
        }
        return next()
    }
}

module.exports={
    checkAuthCookie
}
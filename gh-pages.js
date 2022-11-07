var ghpages = require('gh-pages');

ghpages.publish(
    'public', // path to public directory
    {
        branch: 'gh-pages',
        repo: 'https://github.com/Bakersbakebread/seanthorne.git', // Update to point to your repository  
        user: {
            name: 'BakersBakeBread', // update to use your name
            email: 'hello@seanthorne.co.uk' // Update to use your email
        }
    },
    () => {
        console.log('Deploy Complete!')
    }
)
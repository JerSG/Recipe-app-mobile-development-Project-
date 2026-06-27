VERY IMPORTANT : 

You might encounter this error or a similar kind of error in the terminal while running the code 


npm : File C:\Program Files\nodejs\npm.ps1 cannot be loaded. The file C:\Program Files\nodejs\npm.ps1 is not digitally
signed. You cannot run this script on the current system. For more information about running scripts and setting
execution policy, see about_Execution_Policies at https:/go.microsoft.com/fwlink/?LinkID=135170.
At line:1 char:1
+ npm install
+ ~~~
    + CategoryInfo          : SecurityError: (:) [], PSSecurityException
    + FullyQualifiedErrorId : UnauthorizedAccess


 If there is any error regarding npm execution policy or signed in issue,  run the following command first in the VS code terminal
 or command prompt  (temporary measure) (reccommended ) :


Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass       


or for permanent measure ( which allows local scripts to run and remote scripts only if they are signed ) can alternatively type : 

Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned




after that type: npm install 

and then type: npx expo start 



Additional info: 

Note : if it works then its good . If it does not work , check if some of the dependencies are  installed or not . If not ,  just install the following dependencies in the VS code terminal :

npm install @react-navigation/native
npm install react-native-screens react-native-safe-area-context
npm install @react-navigation/bottom-tabs
npm install @react-navigation/native-stack
expo install @expo/vector-icons
expo install expo-image
expo install expo-linear-gradient
npm install react-native-webview
npm install @react-native-async-storage/async-storage
npm install react-native-safe-area-context

and then try npm install and then npx expo start


Also if there is an error if the global expo cli is not compatible , its because it could be a  Node.js version 17+ . The global expo-cli is not compatible with Node.js version above 17+ 

if that error happens , first uninstall global  expo cli using :

npm uninstall -g expo-cli

then make sure the expo package is installed locally in your project by using :
npm install expo

then run it by using:

npx expo start 

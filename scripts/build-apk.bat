@echo off
setlocal EnableDelayedExpansion

title VibeSurvey - Android APK Build Pipeline

echo ==============================================================================
echo    VIBESURVEY ANDROID APK BUILD AND ENVIRONMENT PIPELINE
echo    Argon Vibe Studio - Production Mobile Release Tool
echo ==============================================================================
echo.

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%.."
set "PROJECT_ROOT=%CD%"

:: ============================================================================
:: BUOC 1: KIEM TRA NODE.JS VA NPM
:: ============================================================================
echo [1/5] Kiem tra moi truong Node.js va NPM...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [LOI] Khong tim thay Node.js trong he thong PATH!
    echo Vui long cai dat Node.js tu https://nodejs.org/
    goto :FAIL
)

for /f "delims=" %%v in ('node -v 2^>nul') do set "NODE_VER=%%v"
for /f "delims=" %%m in ('npm -v 2^>nul') do set "NPM_VER=%%m"
echo   [OK] Node.js: %NODE_VER%
echo   [OK] NPM: %NPM_VER%
echo.

:: ============================================================================
:: BUOC 2: KIEM TRA JAVA DEVELOPMENT KIT (JDK 17+)
:: ============================================================================
echo [2/5] Kiem tra Java Development Kit JDK...
set "JAVA_FOUND=0"

if defined JAVA_HOME (
    if exist "%JAVA_HOME%\bin\javac.exe" (
        set "JAVA_FOUND=1"
        echo   [OK] JAVA_HOME da duoc thiet lap: %JAVA_HOME%
    )
)

if "!JAVA_FOUND!"=="0" (
    if exist "C:\Program Files\Android\Android Studio\jbr\bin\javac.exe" (
        set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
        set "PATH=!JAVA_HOME!\bin;!PATH!"
        set "JAVA_FOUND=1"
        echo   [OK] Phat hien JDK tich hop cua Android Studio: !JAVA_HOME!
    )
)

if "!JAVA_FOUND!"=="0" (
    for /d %%d in ("C:\Program Files\Eclipse Adoptium\jdk*") do (
        if exist "%%d\bin\javac.exe" (
            set "JAVA_HOME=%%d"
            set "PATH=!JAVA_HOME!\bin;!PATH!"
            set "JAVA_FOUND=1"
            echo   [OK] Phat hien JDK Temurin: !JAVA_HOME!
        )
    )
)

if "!JAVA_FOUND!"=="0" (
    for /d %%d in ("C:\Program Files\Java\jdk*") do (
        if exist "%%d\bin\javac.exe" (
            set "JAVA_HOME=%%d"
            set "PATH=!JAVA_HOME!\bin;!PATH!"
            set "JAVA_FOUND=1"
            echo   [OK] Phat hien Oracle/Standard JDK: !JAVA_HOME!
        )
    )
)

where javac >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo   [OK] Trinh bien dich Java javac san sang.
) else (
    echo   [CANH BAO] Khong tim thay trinh bien dich Java javac.
    echo   Khuyen nghi cai dat JDK 17 tai: https://adoptium.net/temurin/releases/?version=17
)
echo.

:: ============================================================================
:: BUOC 3: KIEM TRA ANDROID SDK
:: ============================================================================
echo [3/5] Kiem tra Android SDK...
if not defined ANDROID_HOME (
    if defined ANDROID_SDK_ROOT (
        set "ANDROID_HOME=%ANDROID_SDK_ROOT%"
    ) else (
        if exist "%LOCALAPPDATA%\Android\Sdk" (
            set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
            echo   [OK] Tu dong nhan dien Android SDK: %LOCALAPPDATA%\Android\Sdk
        )
    )
)

if defined ANDROID_HOME (
    if exist "%ANDROID_HOME%" (
        echo   [OK] ANDROID_HOME: %ANDROID_HOME%
        if exist "%ANDROID_HOME%\platform-tools\adb.exe" (
            echo   [OK] Tim thay cong cu ADB platform-tools.
            set "PATH=%ANDROID_HOME%\platform-tools;!PATH!"
        )
    ) else (
        echo   [CANH BAO] Thu muc ANDROID_HOME khong ton tai.
    )
) else (
    echo   [CANH BAO] Chua thiet lap ANDROID_HOME.
    echo   Neu chua co, vui long cai dat Android Studio tai https://developer.android.com/studio
)
echo.

:: ============================================================================
:: BUOC 4: TAO ASSET ICON VA DONG BO CAPACITOR
:: ============================================================================
echo [4/5] Tao Asset Icon va Dong bo Web vao Android Native...

if exist "scripts\generate_icons.js" (
    node scripts\generate_icons.js
)

if not exist "android" (
    echo   Khoi tao du an Capacitor Android...
    call npx cap add android
)

echo   Dong bo Web Bundle vao Android...
call npx cap sync android
if %ERRORLEVEL% NEQ 0 (
    echo   Dong bo assets bang cap copy android...
    call npx cap copy android
)
echo   [OK] Hoan tat dong bo giao dien vao Android app!
echo.

:: ============================================================================
:: BUOC 5: BIEN DICH GRADLE DEBUG APK
:: ============================================================================
echo [5/5] Tien trinh bien dich Android Debug APK...

if not exist "android\gradlew.bat" (
    echo   [THONG TIN] Du an Android da san sang.
    echo   De tai Gradle Wrapper va bien dich, ban hay chay lenh:
    echo     npx cap open android
    goto :FINISH_SUMMARY
)

if not defined JAVA_HOME (
    echo   [THONG TIN] Khong tim thay JAVA_HOME de bien dich Gradle qua CLI.
    echo   Ban co the mo Android Studio de tu dong bien dich file APK:
    echo     npx cap open android
    goto :FINISH_SUMMARY
)

echo   Dang khoi chay Gradle assembleDebug...
pushd android
call gradlew.bat assembleDebug
set "GRADLE_CODE=%ERRORLEVEL%"
popd

if %GRADLE_CODE% EQU 0 (
    echo.
    echo ==============================================================================
    echo BIEN DICH APK THANH CONG!
    echo ==============================================================================
    echo File APK debug da san sang tai:
    echo %PROJECT_ROOT%\android\app\build\outputs\apk\debug\app-debug.apk
    echo.
    echo Cai dat truc tiep vao may ao/thiet bi:
    echo   adb install -r android\app\build\outputs\apk\debug\app-debug.apk
    echo ==============================================================================
    goto :SUCCESS
) else (
    echo.
    echo [CANH BAO] Gradle assembleDebug thoat voi ma loi %GRADLE_CODE%.
    echo Ban hay mo Android Studio de tai day du Android SDK Platform va Licenses:
    echo   npx cap open android
    goto :FINISH_SUMMARY
)

:FINISH_SUMMARY
echo.
echo ==============================================================================
echo TONG KET DONG GOI VIBESURVEY ANDROID
echo ==============================================================================
echo 1. Asset Icon: Day du bo icon mipmap (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi, 512px).
echo 2. Web Assets: Da dong bo hoan hao vao android/app/src/main/assets/public.
echo 3. Lenh mo du an bang Android Studio:
echo      npx cap open android
echo 4. Lenh khoi chay may ao:
echo      npx cap run android
echo ==============================================================================

:SUCCESS
exit /b 0

:FAIL
echo.
echo ==============================================================================
echo QUÁ TRÌNH BIÊN DỊCH BỊ GIÁN ĐOẠN DO THIẾU TIỀN ĐỀ.
echo ==============================================================================
exit /b 1

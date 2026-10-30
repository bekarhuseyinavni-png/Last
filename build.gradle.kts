tasks.register<Exec>("assembleDebug") {
    commandLine("npm", "run", "build")
}

tasks.register<Exec>("lint") {
    commandLine("npx", "tsc", "--noEmit")
}

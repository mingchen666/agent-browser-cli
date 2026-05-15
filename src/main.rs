mod cli;
mod config;
mod html;
mod protocol;
mod server;

use anyhow::Result;

fn main() -> Result<()> {
    cli::run()
}

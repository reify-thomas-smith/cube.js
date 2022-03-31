use sqlparser::ast;

use crate::sql::statement::{BindValue, StatementParamsBinder, FoundParameter};
use super::protocol::RowDescriptionField;

#[derive(Debug)]
pub struct PreparedStatement {
    pub query: ast::Statement,
    pub parameters: Vec<FoundParameter>,
    pub description: Vec<RowDescriptionField>,
}

impl PreparedStatement {
    pub fn bind(&self, values: Vec<BindValue>) -> ast::Statement {
        let mut binder = StatementParamsBinder::new(vec![]);
        let mut statement = self.query.clone();
        binder.bind(&mut statement);

        statement
    }
}
